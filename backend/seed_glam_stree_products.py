import asyncio
import asyncpg
import os
import uuid
import json
from datetime import datetime, timezone
from dotenv import dotenv_values

backend_dir = os.path.dirname(os.path.abspath(__file__))
env_vars = dotenv_values(os.path.join(backend_dir, ".env"))
db_url = env_vars.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

# Targeted Vendors:
# 1. VND0010 (Glam stree nails - Apeksha Jondhale)
# 2. VND0007 (DGS / dgs-9361 - Vikram Wadkar)
TARGET_VENDORS = [
    uuid.UUID("96c282a1-5710-46f2-87f9-425f074fc6c4"),
    uuid.UUID("807fb299-5164-40ac-8c9a-2008955768cf"),
]

CATEGORIES_DATA = [
    {"name": "Bestsellers", "slug": "bestsellers", "sort_order": 0, "image_url": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80"},
    {"name": "French & Nude", "slug": "french-nude", "sort_order": 1, "image_url": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80"},
    {"name": "Party & Bridal", "slug": "party-bridal", "sort_order": 2, "image_url": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80"},
    {"name": "Daily Minimal", "slug": "daily-minimal", "sort_order": 3, "image_url": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"},
    {"name": "Chrome & Velvet", "slug": "chrome-velvet", "sort_order": 4, "image_url": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80"},
]

PRODUCTS_DATA = [
    {
        "name": "Deep Red Burgundy - Glossy Press On Nails",
        "slug": "deep-red-burgundy-glossy-press-on-nails",
        "cat_slug": "bestsellers",
        "regular_price": 1299.0,
        "sale_price": 499.0,
        "sku": "GS-NAIL-BURGUNDY",
        "stock": 45,
        "is_featured": True,
        "description": "Rich, sultry wine burgundy nails crafted with 5 coats of ultra-glossy salon UV gel. Includes free ₹299 application kit (dual-sided buffer, wooden cuticle stick, alcohol prep pads, adhesive tabs & ultra-bond nail glue). Reusable 5+ times.",
        "thumbnail": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
            "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
            "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
        ],
    },
    {
        "name": "Classic French Nude Almond - Press On Nails",
        "slug": "classic-french-nude-almond-press-on-nails",
        "cat_slug": "french-nude",
        "regular_price": 1299.0,
        "sale_price": 499.0,
        "sku": "GS-NAIL-FRENCH",
        "stock": 60,
        "is_featured": True,
        "description": "The timeless Parisian French manicure with an ultra-natural translucent pink base and crisp white smile line. Chic, minimal, and ideal for office and boardroom elegance. 100% salon gel finish.",
        "thumbnail": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
            "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
        ],
    },
    {
        "name": "Royal Navy Blue Shimmer - Coffin Nails",
        "slug": "royal-navy-blue-shimmer-coffin-nails",
        "cat_slug": "bestsellers",
        "regular_price": 1399.0,
        "sale_price": 549.0,
        "sku": "GS-NAIL-NAVY",
        "stock": 32,
        "is_featured": True,
        "description": "Midnight royal navy blue with micro-diamond holographic shimmer that catches the light with every move. A showstopping evening statement with reinforced apex structure for maximum durability.",
        "thumbnail": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
            "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
        ],
    },
    {
        "name": "Velvet Emerald Forest - Matte Press On Nails",
        "slug": "velvet-emerald-forest-matte-press-on-nails",
        "cat_slug": "party-bridal",
        "regular_price": 1399.0,
        "sale_price": 549.0,
        "sku": "GS-NAIL-EMERALD",
        "stock": 28,
        "is_featured": True,
        "description": "Deep opulent forest green coated in a smooth velvet matte texture with hand-painted 18k gold chrome accents along the cuticle line. Includes complimentary professional prep kit.",
        "thumbnail": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&q=80",
            "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
        ],
    },
    {
        "name": "Mocha Coffee Swirls - Glossy Press On Nails",
        "slug": "mocha-coffee-swirls-glossy-press-on-nails",
        "cat_slug": "daily-minimal",
        "regular_price": 1299.0,
        "sale_price": 499.0,
        "sku": "GS-NAIL-MOCHA",
        "stock": 40,
        "is_featured": False,
        "description": "Modern abstract coffee and warm chocolate swirls over a soft caramel nude translucent base. Contemporary, soothing, and versatile for daily styling. Reusable up to 5 times.",
        "thumbnail": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
        ],
    },
    {
        "name": "Rose Gold Glitter Ombre - Bridal Nails",
        "slug": "rose-gold-glitter-ombre-bridal-nails",
        "cat_slug": "party-bridal",
        "regular_price": 1499.0,
        "sale_price": 599.0,
        "sku": "GS-NAIL-ROSEGOLD",
        "stock": 25,
        "is_featured": True,
        "description": "Cascading rose gold glitter fading gracefully into blush pink. Specially crafted for brides, bridesmaids, and festive cocktail celebrations. Non-yellowing premium UV top coat.",
        "thumbnail": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
        ],
    },
    {
        "name": "Glazed Donut Pearl Chrome - Press On Nails",
        "slug": "glazed-donut-pearl-chrome-press-on-nails",
        "cat_slug": "chrome-velvet",
        "regular_price": 1399.0,
        "sale_price": 549.0,
        "sku": "GS-NAIL-GLAZED",
        "stock": 50,
        "is_featured": True,
        "description": "The viral glazed donut iridescent pearl chrome effect over clean milky white. Luminous, angelic, and mesmerising under daylight. Handcrafted with high grade acrylic resin.",
        "thumbnail": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
        ],
    },
    {
        "name": "Sage Green & Gold Leaf - Minimalist Nails",
        "slug": "sage-green-gold-leaf-minimalist-nails",
        "cat_slug": "daily-minimal",
        "regular_price": 1299.0,
        "sale_price": 499.0,
        "sku": "GS-NAIL-SAGE",
        "stock": 35,
        "is_featured": False,
        "description": "Earthy pastel sage green accented with delicate 24k metallic gold leaf flakes. Subtle luxury designed for everyday wear without chipping or fading.",
        "thumbnail": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=800&q=80",
        ],
    },
    {
        "name": "Golden Honey Amber Glass - Coffin Nails",
        "slug": "golden-honey-amber-glass-coffin-nails",
        "cat_slug": "bestsellers",
        "regular_price": 1399.0,
        "sale_price": 549.0,
        "sku": "GS-NAIL-AMBER",
        "stock": 30,
        "is_featured": True,
        "description": "Translucent syrup amber glass nails with warm tortoiseshell marbling and golden foil accents. Luxurious salon design delivered straight to your door.",
        "thumbnail": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
        ],
    },
    {
        "name": "Lavender Aura Quartz Chrome - Almond Nails",
        "slug": "lavender-aura-quartz-chrome-almond-nails",
        "cat_slug": "chrome-velvet",
        "regular_price": 1399.0,
        "sale_price": 549.0,
        "sku": "GS-NAIL-LAVENDER",
        "stock": 28,
        "is_featured": False,
        "description": "Pastel lilac aura fade with violet chrome sheen and celestial silver glitter dusting. Beautifully shaped in feminine almond length for effortless elegance.",
        "thumbnail": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800&q=80",
        ],
    },
]

VARIANTS_TEMPLATE = [
    {"name": "Size XS (14, 11, 12, 11, 8 mm)", "sku_suffix": "-XS", "price_offset": 0.0, "stock": 10},
    {"name": "Size S (15, 12, 13, 12, 9 mm)", "sku_suffix": "-S", "price_offset": 0.0, "stock": 12},
    {"name": "Size M (16, 13, 14, 13, 10 mm)", "sku_suffix": "-M", "price_offset": 0.0, "stock": 15},
    {"name": "Size L (17, 14, 15, 14, 11 mm)", "sku_suffix": "-L", "price_offset": 0.0, "stock": 8},
    {"name": "Custom Size (Custom mm measurements)", "sku_suffix": "-CUST", "price_offset": 0.0, "stock": 99},
]

async def seed():
    conn = await asyncpg.connect(db_url, statement_cache_size=0)
    try:
        now = datetime.now(timezone.utc)
        for vendor_id in TARGET_VENDORS:
            # Check vendor exists
            vendor_row = await conn.fetchrow("SELECT vendor_code, status FROM platform_vendors WHERE id = $1", vendor_id)
            if not vendor_row:
                print(f"Skipping vendor {vendor_id} (not found)")
                continue

            v_code = vendor_row['vendor_code']
            print(f"\n==========================================")
            print(f"Seeding for Vendor: {v_code} ({vendor_id})")
            print(f"==========================================")

            # 1. Upsert Categories
            cat_map = {}
            for c in CATEGORIES_DATA:
                existing_cat = await conn.fetchrow(
                    "SELECT id FROM platform_categories WHERE vendor_id = $1 AND slug = $2",
                    vendor_id, c["slug"]
                )
                if existing_cat:
                    cat_id = existing_cat["id"]
                    print(f"  Category exists: {c['name']} ({cat_id})")
                else:
                    cat_id = uuid.uuid4()
                    await conn.execute("""
                        INSERT INTO platform_categories (id, vendor_id, name, slug, image_url, is_active, sort_order, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """, cat_id, vendor_id, c["name"], c["slug"], c["image_url"], True, c["sort_order"], now, now)
                    print(f"  Created Category: {c['name']} ({cat_id})")
                cat_map[c["slug"]] = cat_id

            # 2. Upsert Products
            for p in PRODUCTS_DATA:
                cat_id = cat_map.get(p["cat_slug"])
                existing_prod = await conn.fetchrow(
                    "SELECT id FROM platform_products WHERE vendor_id = $1 AND slug = $2",
                    vendor_id, p["slug"]
                )
                if existing_prod:
                    prod_id = existing_prod["id"]
                    # Update details so prices and descriptions are up to date
                    await conn.execute("""
                        UPDATE platform_products
                        SET name = $1, description = $2, regular_price = $3, sale_price = $4,
                            sku = $5, stock_quantity = $6, status = 'active', is_featured = $7,
                            thumbnail_url = $8, has_variants = true, category_id = $9, updated_at = $10
                        WHERE id = $11
                    """, p["name"], p["description"], p["regular_price"], p["sale_price"],
                         p["sku"], p["stock"], p["is_featured"], p["thumbnail"], cat_id, now, prod_id)
                    print(f"  Updated Product: {p['name']} ({prod_id})")
                else:
                    prod_id = uuid.uuid4()
                    await conn.execute("""
                        INSERT INTO platform_products (
                            id, vendor_id, category_id, name, slug, description,
                            regular_price, sale_price, sku, stock_quantity, status,
                            is_featured, thumbnail_url, has_variants, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                    """, prod_id, vendor_id, cat_id, p["name"], p["slug"], p["description"],
                         p["regular_price"], p["sale_price"], p["sku"], p["stock"], "active",
                         p["is_featured"], p["thumbnail"], True, now, now)
                    print(f"  Inserted Product: {p['name']} ({prod_id})")

                # 3. Product Images
                # Delete old images and reinsert
                await conn.execute("DELETE FROM platform_product_images WHERE product_id = $1", prod_id)
                for idx, img_url in enumerate(p["images"]):
                    img_id = uuid.uuid4()
                    await conn.execute("""
                        INSERT INTO platform_product_images (
                            id, product_id, vendor_id, image_url, storage_path,
                            file_size_bytes, sort_order, is_thumbnail, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """, img_id, prod_id, vendor_id, img_url, None, 120000, idx, idx == 0, now, now)

                # 4. Product Variants (Sizes)
                await conn.execute("DELETE FROM platform_product_variants WHERE product_id = $1", prod_id)
                for v_idx, v in enumerate(VARIANTS_TEMPLATE):
                    var_id = uuid.uuid4()
                    var_sku = f"{p['sku']}{v['sku_suffix']}"
                    var_price = p["sale_price"] + v["price_offset"]
                    await conn.execute("""
                        INSERT INTO platform_product_variants (
                            id, product_id, vendor_id, name, sku, price,
                            stock_quantity, images_json, sort_order, is_active, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """, var_id, prod_id, vendor_id, v["name"], var_sku, var_price,
                         v["stock"], json.dumps([p["thumbnail"]]), v_idx, True, now, now)

        print("\nAll products, categories, images, and variants seeded successfully!")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed())

