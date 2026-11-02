"""
Digital Growth Studio — Platform Database Seeder & Demo Data Generator
Initializes default plans, Super Admin, and demo vendors (ABC Fashion & XYZ Cosmetics).
"""
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.platform_auth import hash_password
from app.models.platform.vendor import (
    PlatformUser,
    PlatformVendor,
    PlatformVendorProfile,
    PlatformStore,
    PlatformVendorAppConfig,
    PlatformStorageUsage,
)
from app.models.platform.catalog import (
    PlatformCategory,
    PlatformProduct,
    PlatformProductImage,
    PlatformBanner,
)
from app.models.platform.order import (
    PlatformCustomer,
    PlatformOrder,
    PlatformOrderItem,
)
from app.models.platform.subscription import (
    PlatformPlan,
    PlatformSubscription,
    PlatformAddon,
)


async def seed_platform_database(db: AsyncSession):
    """Seed initial plans, add-ons, super admin, and demo vendors."""
    now = datetime.now(timezone.utc)

    # 1. Seed Plans
    plan_stmt = select(PlatformPlan).where(PlatformPlan.slug == "starter-store")
    starter_plan = (await db.execute(plan_stmt)).scalar_one_or_none()
    if not starter_plan:
        starter_plan = PlatformPlan(
            name="Starter Store",
            slug="starter-store",
            monthly_price_inr=499.0,
            setup_fee_inr=2000.0,
            storage_limit_mb=1024,
            max_products=100,
            is_active=True,
            features_json='["Online Storefront", "Branded Android App Support", "Unlimited Orders", "1GB Bunny.net Storage", "Cash On Delivery & Razorpay"]',
        )
        db.add(starter_plan)
        await db.flush()

    # 2. Seed Default Add-ons
    default_addons = [
        {"name": "Additional 5GB Bunny Storage", "code": "storage-5gb", "price": 299.0, "type": "MONTHLY"},
        {"name": "Custom Domain Setup", "code": "custom-domain", "price": 999.0, "type": "ONE_TIME"},
        {"name": "Razorpay Payment Gateway Assistance", "code": "razorpay-setup", "price": 499.0, "type": "ONE_TIME"},
        {"name": "Custom Android App Theme & Splash", "code": "app-customization", "price": 1499.0, "type": "ONE_TIME"},
        {"name": "Priority Google Play Store Deployment", "code": "playstore-priority", "price": 999.0, "type": "ONE_TIME"},
    ]
    for add_data in default_addons:
        chk = (await db.execute(select(PlatformAddon).where(PlatformAddon.code == add_data["code"]))).scalar_one_or_none()
        if not chk:
            db.add(PlatformAddon(
                name=add_data["name"],
                code=add_data["code"],
                price_inr=add_data["price"],
                billing_type=add_data["type"],
                is_active=True,
            ))

    # 3. Seed Super Admin
    admin_stmt = select(PlatformUser).where(PlatformUser.email == "admin@digitalgrowthstudio.in")
    super_admin = (await db.execute(admin_stmt)).scalar_one_or_none()
    if not super_admin:
        super_admin = PlatformUser(
            email="admin@digitalgrowthstudio.in",
            hashed_password=hash_password("Admin@DGS2026!"),
            name="Digital Growth Super Admin",
            role="SUPER_ADMIN",
            status="active",
        )
        db.add(super_admin)

    # 4. Seed Demo Vendor A: ABC Fashion (VND0001, abc.digitalgrowthstudio.in)
    vendor_a_stmt = select(PlatformVendor).where(PlatformVendor.vendor_code == "VND0001")
    vendor_a = (await db.execute(vendor_a_stmt)).scalar_one_or_none()
    if not vendor_a:
        user_a = PlatformUser(
            email="abcfashion@digitalgrowthstudio.in",
            hashed_password=hash_password("Vendor@123"),
            name="Ananya Sharma",
            role="VENDOR_ADMIN",
            status="active",
        )
        db.add(user_a)
        await db.flush()

        vendor_a = PlatformVendor(vendor_code="VND0001", user_id=user_a.id, status="active")
        db.add(vendor_a)
        await db.flush()

        profile_a = PlatformVendorProfile(
            vendor_id=vendor_a.id,
            business_name="ABC Fashion",
            owner_name="Ananya Sharma",
            email="abcfashion@digitalgrowthstudio.in",
            phone="+91 9876543210",
            category="Clothing & Apparel",
            address="12 MG Road, Indiranagar, Bangalore, Karnataka 560038",
            description="Premium western wear, ethnic ensembles and modern designer fashion for women and men.",
            gst_number="29ABCDE1234F1Z5",
            logo_url="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&q=80",
        )
        db.add(profile_a)

        store_a = PlatformStore(
            vendor_id=vendor_a.id,
            store_name="ABC Fashion Store",
            store_slug="abc",
            subdomain="abc.digitalgrowthstudio.in",
            status="active",
            primary_color="#2563EB",
            secondary_color="#1E293B",
            description="Discover trendsetting fashion and style statement collections with instant delivery.",
            logo_url="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&q=80",
            banner_url="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80",
            contact_email="care@abcfashion.in",
            contact_phone="+91 9876543210",
            business_address="12 MG Road, Indiranagar, Bangalore, Karnataka",
            cod_enabled=True,
            razorpay_enabled=True,
            razorpay_key_id="rzp_test_abc12345",
        )
        db.add(store_a)

        app_config_a = PlatformVendorAppConfig(
            vendor_id=vendor_a.id,
            app_name="ABC Fashion App",
            app_logo_url="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&q=80",
            splash_screen_url="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80",
            primary_color="#2563EB",
            secondary_color="#1E293B",
            package_id="in.digitalgrowthstudio.abcfashion",
            app_build_status="BUILT",
            app_version="1.0.2",
            playstore_url="https://play.google.com/store/apps/details?id=in.digitalgrowthstudio.abcfashion",
            publication_status="PUBLISHED",
        )
        db.add(app_config_a)

        storage_a = PlatformStorageUsage(
            vendor_id=vendor_a.id,
            total_bytes_used=18454912,  # ~17.6MB
            image_bytes_used=18454912,
            product_count=4,
            limit_bytes=1073741824,
        )
        db.add(storage_a)

        sub_a = PlatformSubscription(
            vendor_id=vendor_a.id,
            plan_id=starter_plan.id,
            status="active",
            starts_at=now,
            expires_at=now + timedelta(days=30),
            next_renewal_date=now + timedelta(days=30),
            monthly_price_inr=starter_plan.monthly_price_inr,
            setup_fee_paid=True,
        )
        db.add(sub_a)

        # Categories for ABC Fashion
        cat_dresses = PlatformCategory(vendor_id=vendor_a.id, name="Dresses", slug="dresses", sort_order=1)
        cat_jackets = PlatformCategory(vendor_id=vendor_a.id, name="Jackets & Coats", slug="jackets", sort_order=2)
        db.add(cat_dresses)
        db.add(cat_jackets)
        await db.flush()

        # Products for ABC Fashion
        p1 = PlatformProduct(
            vendor_id=vendor_a.id,
            category_id=cat_dresses.id,
            name="Classic Floral Summer Dress",
            slug="classic-floral-summer-dress",
            description="Breezy cotton floral dress with elegant silhouette, perfect for sunny day outings.",
            regular_price=1999.0,
            sale_price=1499.0,
            sku="ABC-DRS-001",
            stock_quantity=25,
            status="active",
            is_featured=True,
            thumbnail_url="https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&q=80",
        )
        p2 = PlatformProduct(
            vendor_id=vendor_a.id,
            category_id=cat_jackets.id,
            name="Urban Denim Trucker Jacket",
            slug="urban-denim-trucker-jacket",
            description="Timeless indigo wash denim jacket with brass buttons and relaxed streetwear fit.",
            regular_price=3499.0,
            sale_price=2799.0,
            sku="ABC-JKT-002",
            stock_quantity=14,
            status="active",
            is_featured=True,
            thumbnail_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80",
        )
        db.add(p1)
        db.add(p2)
        await db.flush()

        # Images for ABC Fashion products
        db.add(PlatformProductImage(product_id=p1.id, vendor_id=vendor_a.id, image_url=p1.thumbnail_url, is_thumbnail=True, sort_order=0))
        db.add(PlatformProductImage(product_id=p2.id, vendor_id=vendor_a.id, image_url=p2.thumbnail_url, is_thumbnail=True, sort_order=0))

        # Banners for ABC Fashion
        b1 = PlatformBanner(
            vendor_id=vendor_a.id,
            title="Summer Solstice Collection 2026",
            description="Up to 40% OFF on all designer dresses this weekend only!",
            promo_offer="FLAT 40% OFF",
            image_url="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80",
            sort_order=1,
            is_active=True,
        )
        db.add(b1)

        # Customers & Order for ABC Fashion
        cust_a = PlatformCustomer(
            vendor_id=vendor_a.id,
            name="Rohan Verma",
            phone="+91 9123456780",
            email="rohan.verma@example.com",
            total_orders=1,
            total_spent=1499.0,
            last_order_at=now,
        )
        db.add(cust_a)
        await db.flush()

        ord_a = PlatformOrder(
            vendor_id=vendor_a.id,
            customer_id=cust_a.id,
            order_number="ORD-VND0001-1001",
            customer_name="Rohan Verma",
            customer_phone="+91 9123456780",
            customer_email="rohan.verma@example.com",
            shipping_address="Flat 402, Sunset Heights, Koramangala 4th Block, Bangalore",
            total_amount=1499.0,
            payment_method="COD",
            payment_status="PENDING",
            order_status="CONFIRMED",
            notes="Please deliver between 10am and 2pm.",
        )
        db.add(ord_a)
        await db.flush()

        db.add(PlatformOrderItem(
            order_id=ord_a.id,
            vendor_id=vendor_a.id,
            product_id=p1.id,
            product_name=p1.name,
            product_sku=p1.sku,
            price=1499.0,
            quantity=1,
            total=1499.0,
        ))

    # 5. Seed Demo Vendor B: XYZ Cosmetics (VND0002, xyz.digitalgrowthstudio.in)
    vendor_b_stmt = select(PlatformVendor).where(PlatformVendor.vendor_code == "VND0002")
    vendor_b = (await db.execute(vendor_b_stmt)).scalar_one_or_none()
    if not vendor_b:
        user_b = PlatformUser(
            email="xyzcosmetics@digitalgrowthstudio.in",
            hashed_password=hash_password("Vendor@123"),
            name="Pooja Patel",
            role="VENDOR_ADMIN",
            status="active",
        )
        db.add(user_b)
        await db.flush()

        vendor_b = PlatformVendor(vendor_code="VND0002", user_id=user_b.id, status="active")
        db.add(vendor_b)
        await db.flush()

        profile_b = PlatformVendorProfile(
            vendor_id=vendor_b.id,
            business_name="XYZ Cosmetics",
            owner_name="Pooja Patel",
            email="xyzcosmetics@digitalgrowthstudio.in",
            phone="+91 9822334455",
            category="Health & Beauty",
            address="45 Bandra West, Linking Road, Mumbai, Maharashtra 400050",
            description="Organic vegan skincare, botanical serums, and gentle cruelty-free beauty essentials.",
            gst_number="27XYZAB9876C1Z3",
            logo_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80",
        )
        db.add(profile_b)

        store_b = PlatformStore(
            vendor_id=vendor_b.id,
            store_name="XYZ Cosmetics Glow Bar",
            store_slug="xyz",
            subdomain="xyz.digitalgrowthstudio.in",
            status="active",
            primary_color="#10B981",
            secondary_color="#064E3B",
            description="Clean beauty crafted from natural botanicals for healthy, radiant skin every day.",
            logo_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80",
            banner_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80",
            contact_email="support@xyzcosmetics.in",
            contact_phone="+91 9822334455",
            business_address="45 Bandra West, Linking Road, Mumbai",
            cod_enabled=True,
            razorpay_enabled=False,
        )
        db.add(store_b)

        app_config_b = PlatformVendorAppConfig(
            vendor_id=vendor_b.id,
            app_name="XYZ Glow App",
            app_logo_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&q=80",
            splash_screen_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
            primary_color="#10B981",
            secondary_color="#064E3B",
            package_id="in.digitalgrowthstudio.xyzcosmetics",
            app_build_status="IN_DEVELOPMENT",
            app_version="1.0.0",
            publication_status="UNPUBLISHED",
        )
        db.add(app_config_b)

        storage_b = PlatformStorageUsage(
            vendor_id=vendor_b.id,
            total_bytes_used=9437184,  # ~9MB
            image_bytes_used=9437184,
            product_count=3,
            limit_bytes=1073741824,
        )
        db.add(storage_b)

        sub_b = PlatformSubscription(
            vendor_id=vendor_b.id,
            plan_id=starter_plan.id,
            status="active",
            starts_at=now,
            expires_at=now + timedelta(days=30),
            next_renewal_date=now + timedelta(days=30),
            monthly_price_inr=starter_plan.monthly_price_inr,
            setup_fee_paid=True,
        )
        db.add(sub_b)

        # Categories for XYZ Cosmetics
        cat_serums = PlatformCategory(vendor_id=vendor_b.id, name="Serums & Oils", slug="serums", sort_order=1)
        cat_cleansers = PlatformCategory(vendor_id=vendor_b.id, name="Cleansers & Toners", slug="cleansers", sort_order=2)
        db.add(cat_serums)
        db.add(cat_cleansers)
        await db.flush()

        # Products for XYZ Cosmetics
        p3 = PlatformProduct(
            vendor_id=vendor_b.id,
            category_id=cat_serums.id,
            name="Hydra-Glow Vitamin C Serum 30ml",
            slug="hydra-glow-vitamin-c-serum",
            description="Pure 15% Vitamin C serum with hyaluronic acid for intense hydration and youthful glow.",
            regular_price=1299.0,
            sale_price=999.0,
            sku="XYZ-SRM-001",
            stock_quantity=50,
            status="active",
            is_featured=True,
            thumbnail_url="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80",
        )
        p4 = PlatformProduct(
            vendor_id=vendor_b.id,
            category_id=cat_cleansers.id,
            name="Calming Chamomile Foaming Cleanser",
            slug="calming-chamomile-foaming-cleanser",
            description="Sulfate-free soothing gel cleanser that gently dissolves impurities without stripping moisture.",
            regular_price=799.0,
            sale_price=649.0,
            sku="XYZ-CLN-002",
            stock_quantity=32,
            status="active",
            is_featured=True,
            thumbnail_url="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80",
        )
        db.add(p3)
        db.add(p4)
        await db.flush()

        db.add(PlatformProductImage(product_id=p3.id, vendor_id=vendor_b.id, image_url=p3.thumbnail_url, is_thumbnail=True, sort_order=0))
        db.add(PlatformProductImage(product_id=p4.id, vendor_id=vendor_b.id, image_url=p4.thumbnail_url, is_thumbnail=True, sort_order=0))

        # Banners for XYZ Cosmetics
        b2 = PlatformBanner(
            vendor_id=vendor_b.id,
            title="Clean Botanical Skincare Revolution",
            description="Buy any 2 serums and get a free organic rose mist!",
            promo_offer="BUY 2 GET 1 FREE",
            image_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=80",
            sort_order=1,
            is_active=True,
        )
        db.add(b2)

        # Customers & Order for XYZ Cosmetics
        cust_b = PlatformCustomer(
            vendor_id=vendor_b.id,
            name="Deepa Nair",
            phone="+91 9988776655",
            email="deepa.nair@example.com",
            total_orders=1,
            total_spent=999.0,
            last_order_at=now,
        )
        db.add(cust_b)
        await db.flush()

        ord_b = PlatformOrder(
            vendor_id=vendor_b.id,
            customer_id=cust_b.id,
            order_number="ORD-VND0002-2001",
            customer_name="Deepa Nair",
            customer_phone="+91 9988776655",
            customer_email="deepa.nair@example.com",
            shipping_address="Villa 18, Palm Meadows, Whitefield, Bangalore",
            total_amount=999.0,
            payment_method="COD",
            payment_status="PENDING",
            order_status="PROCESSING",
            notes="Leave at security gate if not answering.",
        )
        db.add(ord_b)
        await db.flush()

        db.add(PlatformOrderItem(
            order_id=ord_b.id,
            vendor_id=vendor_b.id,
            product_id=p3.id,
            product_name=p3.name,
            product_sku=p3.sku,
            price=999.0,
            quantity=1,
            total=999.0,
        ))

    await db.commit()

