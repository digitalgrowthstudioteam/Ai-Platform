"""
Digital Growth Studio — Setup Fresh N Fast Hyperlocal Brand & Fresh Produce Catalog
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from dotenv import load_dotenv
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", ".env")))

from sqlalchemy import select
from app.database import async_session_factory
from app.models.platform.vendor import PlatformVendor, PlatformStore
from app.models.platform.catalog import PlatformCategory, PlatformProduct

async def setup():
    print(">>> [1/3] Updating FRESH N FAST store settings...")
    async with async_session_factory() as db:
        v_stmt = select(PlatformVendor).where(PlatformVendor.vendor_code == 'VND0013')
        vendor = (await db.execute(v_stmt)).scalar_one_or_none()
        if not vendor:
            print("ERROR: Vendor VND0013 not found in database!")
            return

        st_stmt = select(PlatformStore).where(PlatformStore.vendor_id == vendor.id)
        store = (await db.execute(st_stmt)).scalar_one_or_none()
        if not store:
            print("ERROR: Store for VND0013 not found!")
            return

        store.store_name = "Fresh N Fast"
        store.primary_color = "#15803D"  # Fresh Farm Green
        store.secondary_color = "#166534"
        store.description = "Farm fresh vegetables, crisp fruits, and daily kitchen essentials delivered to your doorstep in 15-25 minutes."
        store.hyperlocal_enabled = True
        store.hyperlocal_mode = "radius"
        store.store_location_name = "Fresh N Fast Fulfillment Hub, Sector 4"
        store.store_latitude = 19.0760
        store.store_longitude = 72.8777
        store.max_delivery_radius_km = 15.0
        store.min_order_value = 50.0
        store.base_delivery_fee = 25.0
        store.base_distance_km = 3.0
        store.per_km_fee = 7.0
        store.free_delivery_above = 249.0
        store.estimated_delivery_mins = 20
        store.cod_enabled = True
        store.razorpay_enabled = False
        store.serviceable_pincodes_type = "all"

        await db.commit()
        print(f"Verified store: '{store.store_name}' (slug='{store.store_slug}'), color={store.primary_color}, hyperlocal={store.hyperlocal_enabled}")

        # Check existing categories
        existing_cats = (await db.execute(select(PlatformCategory).where(PlatformCategory.vendor_id == vendor.id))).scalars().all()
        if len(existing_cats) == 0:
            print(">>> [2/3] Creating Quick-Commerce Categories...")
            categories_data = [
                {"name": "Fresh Vegetables", "slug": "fresh-vegetables", "image": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300"},
                {"name": "Fresh Fruits", "slug": "fresh-fruits", "image": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=300"},
                {"name": "Herbs & Seasonings", "slug": "herbs-seasonings", "image": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300"},
                {"name": "Organic & Exotics", "slug": "organic-exotics", "image": "https://images.unsplash.com/photo-1518843875459-f738682238a6?w=300"},
            ]

            cat_map = {}
            for c in categories_data:
                cat = PlatformCategory(
                    vendor_id=vendor.id,
                    name=c["name"],
                    slug=c["slug"],
                    image_url=c["image"],
                    is_active=True,
                    sort_order=len(cat_map),
                )
                db.add(cat)
                cat_map[c["slug"]] = cat

            await db.commit()
            for k, v in cat_map.items():
                await db.refresh(v)
            print(f"Created {len(cat_map)} categories.")

            print(">>> [3/3] Creating Fresh Produce Catalog (Bigbasket / Zepto style)...")
            products_data = [
                # Vegetables
                {"name": "Hybrid Tomato (500g)", "slug": "hybrid-tomato-500g", "cat": "fresh-vegetables", "reg": 35.0, "sale": 26.0, "img": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400", "desc": "Fresh, juicy, and ripe farm tomatoes. Perfect for curries, salads, and soups."},
                {"name": "Fresh Potato / Aloo (1kg)", "slug": "fresh-potato-1kg", "cat": "fresh-vegetables", "reg": 48.0, "sale": 38.0, "img": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400", "desc": "High-starch, smooth-skinned farm fresh potatoes."},
                {"name": "Red Onion / Kanda (1kg)", "slug": "red-onion-1kg", "cat": "fresh-vegetables", "reg": 55.0, "sale": 42.0, "img": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400", "desc": "Crisp, pungent red onions directly from Nashik farms."},
                {"name": "Tender Lady Finger / Bhindi (250g)", "slug": "tender-bhindi-250g", "cat": "fresh-vegetables", "reg": 30.0, "sale": 22.0, "img": "https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?w=400", "desc": "Freshly harvested tender green bhindi."},
                {"name": "Fresh Cauliflower / Gobi (1 pc)", "slug": "fresh-cauliflower-1pc", "cat": "fresh-vegetables", "reg": 45.0, "sale": 34.0, "img": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400", "desc": "Crisp, clean white cauliflower head (approx 400g - 600g)."},

                # Fruits
                {"name": "Royal Gala Apple (4 pcs)", "slug": "royal-gala-apple-4pcs", "cat": "fresh-fruits", "reg": 160.0, "sale": 129.0, "img": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", "desc": "Sweet, crispy, and aromatic Royal Gala apples imported fresh."},
                {"name": "Robusta Banana (1 Dozen)", "slug": "robusta-banana-12pcs", "cat": "fresh-fruits", "reg": 70.0, "sale": 54.0, "img": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", "desc": "Naturally ripened, energy-rich fresh bananas."},
                {"name": "Nagpur Sweet Orange / Mosambi (1kg)", "slug": "nagpur-sweet-orange-1kg", "cat": "fresh-fruits", "reg": 110.0, "sale": 85.0, "img": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400", "desc": "Juicy and refreshing Nagpur oranges."},
                {"name": "Fresh Pomegranate / Anar (2 pcs)", "slug": "fresh-pomegranate-2pcs", "cat": "fresh-fruits", "reg": 140.0, "sale": 115.0, "img": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400", "desc": "Ruby red, sweet, and antioxidant-rich pomegranate seeds."},

                # Herbs
                {"name": "Fresh Coriander / Dhaniya (100g)", "slug": "fresh-coriander-100g", "cat": "herbs-seasonings", "reg": 20.0, "sale": 12.0, "img": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400", "desc": "Aromatic green coriander leaves with roots."},
                {"name": "Spicy Green Chilli (100g)", "slug": "green-chilli-100g", "cat": "herbs-seasonings", "reg": 18.0, "sale": 10.0, "img": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400", "desc": "Fresh fiery green chillies for daily cooking."},
                {"name": "Fresh Ginger / Adrak (100g)", "slug": "fresh-ginger-100g", "cat": "herbs-seasonings", "reg": 25.0, "sale": 18.0, "img": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400", "desc": "Firm, juicy ginger roots for tea and gravies."},

                # Organic / Exotic
                {"name": "Organic Broccoli (1 pc)", "slug": "organic-broccoli-1pc", "cat": "organic-exotics", "reg": 90.0, "sale": 68.0, "img": "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=400", "desc": "Chemical-free, vitamin-packed fresh broccoli."},
                {"name": "Hass Avocado (1 pc)", "slug": "hass-avocado-1pc", "cat": "organic-exotics", "reg": 180.0, "sale": 139.0, "img": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400", "desc": "Creamy, rich Hass avocado ready to eat."},
            ]

            for p in products_data:
                cat_obj = cat_map[p["cat"]]
                prod = PlatformProduct(
                    vendor_id=vendor.id,
                    category_id=cat_obj.id,
                    name=p["name"],
                    slug=p["slug"],
                    description=p["desc"],
                    regular_price=p["reg"],
                    sale_price=p["sale"],
                    sku=f"FNF-{p['slug'][:10].upper()}",
                    stock_quantity=100,
                    status="active",
                    is_featured=True,
                    thumbnail_url=p["img"],
                )
                db.add(prod)

            await db.commit()
            print(f"[SUCCESS] Seeded {len(products_data)} fresh produce products for Fresh N Fast.")
        else:
            print(f"Store already has {len(existing_cats)} categories.")

if __name__ == "__main__":
    asyncio.run(setup())

