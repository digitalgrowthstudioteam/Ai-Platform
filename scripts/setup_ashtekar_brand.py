import os
import sys
import io
import json
import base64
import uuid
import asyncio
import asyncpg
from PIL import Image, ImageDraw
from dotenv import dotenv_values
from pathlib import Path

ROOT_DIR = Path("D:/App/Digital Growth Studio")
BACKEND_DIR = ROOT_DIR / "backend"
UPLOADED_LOGO_PATH = Path(r"C:/Users/vikra/.gemini/antigravity/brain/5c7171d9-f407-4d87-a3f6-399deef22896/.user_uploaded/media_1793869979685_3d189dc0.png")

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(ROOT_DIR))
from scripts.vendor_file_manager import get_vendor_workspace

env_vars = dotenv_values(str(BACKEND_DIR / ".env"))
db_url = env_vars.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

async def setup_ashtekar():
    ws = get_vendor_workspace("ashtekar-collection")
    print(f"Vendor workspace initialized at: {ws.root}")

    # 1. Process Logo
    raw_logo = Image.open(UPLOADED_LOGO_PATH).convert("RGBA")
    
    # Calculate aspect-ratio fit within 440x260 box inside 512x512
    max_w, max_h = 440, 260
    scale = min(max_w / raw_logo.width, max_h / raw_logo.height)
    new_w = int(raw_logo.width * scale)
    new_h = int(raw_logo.height * scale)
    fitted_logo = raw_logo.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Base square canvas (Deep Royal Navy / Charcoal #0F172A)
    canvas = Image.new("RGBA", (512, 512), (15, 23, 42, 255))
    
    # Draw double circular gold border
    draw = ImageDraw.Draw(canvas)
    draw.ellipse((14, 14, 498, 498), outline=(212, 175, 55, 200), width=4)
    draw.ellipse((22, 22, 490, 490), outline=(212, 175, 55, 80), width=2)
    
    # Paste centered
    offset_x = (512 - new_w) // 2
    offset_y = (512 - new_h) // 2
    canvas.paste(fitted_logo, (offset_x, offset_y), mask=fitted_logo)

    # Save to vendor branding folder on D: Drive
    app_icon_path = ws.branding_dir / "app_icon_512.png"
    canvas.save(app_icon_path, "PNG")
    print(f"Saved master app icon: {app_icon_path}")

    # Encode to base64 data URL for database
    buf = io.BytesIO()
    canvas.save(buf, format="PNG")
    logo_base64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    # 2. Database Sync: Theme Colors, Description & Logo
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        store = await conn.fetchrow("""
            SELECT s.vendor_id, s.store_name, s.store_slug, v.vendor_code
            FROM platform_stores s
            JOIN platform_vendors v ON s.vendor_id = v.id
            WHERE s.store_slug = $1
        """, "ashtekar-collection")

        if not store:
            print("ERROR: Vendor ashtekar-collection not found in database!")
            return

        vendor_id = store["vendor_id"]
        print(f"Found store: {store['store_name']} ({store['vendor_code']}) - Vendor ID: {vendor_id}")

        # Mens Apparel Theme:
        # Primary Color: #0F172A (Deep Royal Navy / Charcoal Black)
        # Secondary Color: #D4AF37 (Imperial Sovereign Gold)
        await conn.execute("""
            UPDATE platform_stores
            SET primary_color = $1,
                secondary_color = $2,
                logo_url = $3,
                description = $4
            WHERE vendor_id = $5
        """, "#0F172A", "#D4AF37", logo_base64, "Premium Men's Apparels, Festive Kurtas, Suits, Chinos & Casual Wear", vendor_id)

        await conn.execute("""
            UPDATE platform_vendor_profiles
            SET logo_url = $1,
                category = 'Menswear & Fashion'
            WHERE vendor_id = $2
        """, logo_base64, vendor_id)
        print("Updated store theme colors and logo in database.")

        # 3. Seed Promotional Banners if none exist
        existing_banners = await conn.fetch("SELECT id FROM platform_banners WHERE vendor_id = $1", vendor_id)
        if len(existing_banners) == 0:
            print("Seeding promotional banners for Ashtekar Collection...")
            banners = [
                {
                    "title": "Royal Men's Festive Collection",
                    "description": "Handcrafted Silk Kurtas, Nehru Jackets & Jodhpuris",
                    "promo_offer": "NEW ARRIVALS",
                    "image_url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1200&q=80",
                    "link_url": "/categories",
                    "sort_order": 0,
                },
                {
                    "title": "Bespoke Suits & Tuxedos",
                    "description": "Italian wool blends tailored for modern gentlemen",
                    "promo_offer": "FLAT 15% OFF",
                    "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80",
                    "link_url": "/categories",
                    "sort_order": 1,
                },
                {
                    "title": "Everyday Luxury Cotton & Linens",
                    "description": "Breathable casual shirts, chinos & polo essentials",
                    "promo_offer": "TRENDING NOW",
                    "image_url": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1200&q=80",
                    "link_url": "/categories",
                    "sort_order": 2,
                },
            ]
            for b in banners:
                await conn.execute("""
                    INSERT INTO platform_banners (id, vendor_id, title, description, promo_offer, image_url, link_url, sort_order, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
                """, uuid.uuid4(), vendor_id, b["title"], b["description"], b["promo_offer"], b["image_url"], b["link_url"], b["sort_order"])
            print("Seeded 3 banners.")

        # 4. Seed Categories & Products if none exist
        existing_cats = await conn.fetch("SELECT id, slug FROM platform_categories WHERE vendor_id = $1", vendor_id)
        if len(existing_cats) == 0 or True:
            # Clean any partial products
            await conn.execute("DELETE FROM platform_products WHERE vendor_id = $1", vendor_id)
            cat_map = {}
            if len(existing_cats) == 0:
                print("Seeding Mens Apparel Categories...")
                categories = [
                    ("Festive & Ethnic Wear", "festive-ethnic", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80"),
                    ("Formal Suits & Blazers", "formal-suits", "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&q=80"),
                    ("Casual & Linen Shirts", "casual-shirts", "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=80"),
                    ("Trousers & Chinos", "trousers-chinos", "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=600&q=80"),
                    ("Jackets & Outerwear", "jackets-outerwear", "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&q=80"),
                ]
                for name, slug, img in categories:
                    cid = uuid.uuid4()
                    await conn.execute("""
                        INSERT INTO platform_categories (id, vendor_id, name, slug, image_url, is_active, sort_order, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, true, 0, NOW(), NOW())
                    """, cid, vendor_id, name, slug, img)
                    cat_map[slug] = cid
                print(f"Seeded {len(categories)} categories.")
            else:
                for c in existing_cats:
                    cat_map[c["slug"]] = c["id"]

            products = [
                {
                    "name": "Royal Gold Embroidered Silk Kurta Set",
                    "cat": "festive-ethnic",
                    "price": 2899.0,
                    "mrp": 4499.0,
                    "img": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80",
                    "desc": "Pure raw silk kurta set with antique gold threadwork, mandarin collar, and tapered churidar.",
                    "sizes": ["38 (S)", "40 (M)", "42 (L)", "44 (XL)"],
                },
                {
                    "name": "Navy Blue Classic Slim Fit 2-Piece Suit",
                    "cat": "formal-suits",
                    "price": 5499.0,
                    "mrp": 7999.0,
                    "img": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
                    "desc": "Premium Italian poly-viscose blend tailored suit with peak lapels and flat-front trousers.",
                    "sizes": ["38 (S)", "40 (M)", "42 (L)", "44 (XL)"],
                },
                {
                    "name": "Pure French Linen Mandarin Collar Shirt",
                    "cat": "casual-shirts",
                    "price": 1499.0,
                    "mrp": 2199.0,
                    "img": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80",
                    "desc": "Ultra-breathable 100% French linen shirt in crisp off-white with pearl buttons.",
                    "sizes": ["38 (S)", "40 (M)", "42 (L)", "44 (XL)"],
                },
                {
                    "name": "Olive Green Tailored Stretch Chino Trousers",
                    "cat": "trousers-chinos",
                    "price": 1299.0,
                    "mrp": 1899.0,
                    "img": "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=800&q=80",
                    "desc": "Comfort-stretch cotton twill chino trousers, perfect for office and smart casual wear.",
                    "sizes": ["30", "32", "34", "36", "38"],
                },
                {
                    "name": "Charcoal Black Textured Nehru Jacket",
                    "cat": "festive-ethnic",
                    "price": 1999.0,
                    "mrp": 2999.0,
                    "img": "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80",
                    "desc": "Textured jacquard sleeveless bandhgala jacket with metallic brass button detailing.",
                    "sizes": ["38 (S)", "40 (M)", "42 (L)", "44 (XL)"],
                },
            ]
            for p in products:
                cid = cat_map.get(p["cat"])
                p_slug = p["name"].lower().replace(" ", "-").replace("'", "").replace("&", "and")
                pid = uuid.uuid4()
                sku = f"AC-{p_slug[:6].upper()}"
                await conn.execute("""
                    INSERT INTO platform_products (
                        id, vendor_id, category_id, name, slug, description,
                        regular_price, sale_price, sku, stock_quantity, status,
                        is_featured, has_variants, thumbnail_url, created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 50, 'active', true, true, $10, NOW(), NOW())
                """, pid, vendor_id, cid, p["name"], p_slug, p["desc"], p["mrp"], p["price"], sku, p["img"])

                # Add primary product image
                await conn.execute("""
                    INSERT INTO platform_product_images (id, product_id, vendor_id, image_url, is_thumbnail, sort_order, file_size_bytes, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, true, 0, 102400, NOW(), NOW())
                """, uuid.uuid4(), pid, vendor_id, p["img"])

                # Add size variants
                for idx, size in enumerate(p["sizes"]):
                    await conn.execute("""
                        INSERT INTO platform_product_variants (id, product_id, vendor_id, name, sku, price, stock_quantity, images_json, sort_order, is_active, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, 15, '[]', $7, true, NOW(), NOW())
                    """, uuid.uuid4(), pid, vendor_id, f"Size: {size}", f"{sku}-{size[:2]}", p["price"], idx)
            print("Seeded 5 flagship Men's apparel products with size variants.")

    finally:
        await conn.close()

    # 5. Save Credentials & Branding Metadata inside Brand Folder
    ws.save_credentials({
        "brand_name": "Ashtekar collection",
        "vendor_slug": "ashtekar-collection",
        "vendor_code": "VND0012",
        "android_package_name": "in.digitalgrowthstudio.ashtekar_collection",
        "keystore_alias": "dgs-master-key",
        "keystore_sha1": "5F:53:67:62:97:02:79:9D:63:F9:AA:1B:DE:E1:42:DA:87:B0:C1:8E",
    })
    ws.save_branding({
        "brand_name": "Ashtekar collection",
        "primary_color": "#0F172A",
        "secondary_color": "#D4AF37",
        "subdomain": "ashtekar-collection.digitalgrowthstudio.in",
        "support_phone": "9960143578",
        "category": "Menswear & Fashion",
    })

    # Copy master platform release keystore into vendor credentials folder
    keystore_src = ROOT_DIR / "mobile_app" / "android" / "dgs-platform-release.jks"
    if keystore_src.exists():
        import shutil
        shutil.copy2(keystore_src, ws.credentials_dir / "dgs-platform-release.jks")

    # 6. Install Brand Icons & Configure Android Files
    ws.install_brand_icons(logo_base64)
    ws.setup_android_activity()
    print("All Android launcher icons and Activity configured for Ashtekar Collection.")

if __name__ == "__main__":
    asyncio.run(setup_ashtekar())
