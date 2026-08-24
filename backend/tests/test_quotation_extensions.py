import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timedelta

from app.main import app
from app.dependencies import get_current_user
from app.models.user import User
from app.models.ads_service import MetaAdServiceRequest, ServiceQuotation
from app.api.v1.meta import get_db_user_from_claims

# Mock Admin user claims
ADMIN_CLAIMS = {
    "uid": "mock_firebase_uid_admin_123",
    "email": "flasshgames2026@gmail.com",
    "name": "Admin Owner User",
}

# Mock Standard user claims
NEW_USER_EMAIL = "unregistered_new_user@example.com"
NEW_USER_CLAIMS = {
    "uid": "mock_firebase_uid_new_user_999",
    "email": NEW_USER_EMAIL,
    "name": "Unregistered New User",
}


@pytest.fixture
async def cleanup_test_data(db: AsyncSession):
    # Clean up standard target user if existing
    await db.execute(delete(User).where(User.email == NEW_USER_EMAIL))
    await db.commit()
    yield
    await db.execute(delete(User).where(User.email == NEW_USER_EMAIL))
    await db.commit()


@pytest.mark.anyio
async def test_raise_quotation_for_unregistered_email(db: AsyncSession, cleanup_test_data):
    # Override auth to admin
    app.dependency_overrides[get_current_user] = lambda: ADMIN_CLAIMS

    zero_uuid = "00000000-0000-0000-0000-000000000000"
    payload = {
        "email": NEW_USER_EMAIL,
        "number_of_ads": 5,
        "price_per_ad": 799,
        "validity_days": 10,
        "include_setup": True,
        "setup_price": 1999,
        "include_creative": False,
        "creative_price": 0
    }
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(f"/api/v1/admin/users/{zero_uuid}/raise-quotation", json=payload)
        
    app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "success"
    assert "quotation_id" in res_data
    assert "quotation_link" in res_data
    assert NEW_USER_EMAIL in res_data["quotation_link"]

    # Verify placeholder user and quotation exist in database
    stmt = select(User).where(User.email == NEW_USER_EMAIL)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    assert user is not None
    assert user.firebase_uid == f"placeholder_{NEW_USER_EMAIL}"

    stmt_q = select(ServiceQuotation).where(ServiceQuotation.user_id == user.id)
    res_q = await db.execute(stmt_q)
    quote = res_q.scalar_one_or_none()
    assert quote is not None
    assert quote.status == "pending"


@pytest.mark.anyio
async def test_auth_merge_placeholder_user(db: AsyncSession, cleanup_test_data):
    # Override auth to admin to raise quotation
    app.dependency_overrides[get_current_user] = lambda: ADMIN_CLAIMS

    zero_uuid = "00000000-0000-0000-0000-000000000000"
    payload = {
        "email": NEW_USER_EMAIL,
        "number_of_ads": 5,
        "price_per_ad": 799,
        "validity_days": 10,
        "include_setup": True,
        "setup_price": 1999,
        "include_creative": False,
        "creative_price": 0
    }
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(f"/api/v1/admin/users/{zero_uuid}/raise-quotation", json=payload)
        assert res.status_code == 200

    app.dependency_overrides.pop(get_current_user, None)

    # Verify placeholder user has placeholder firebase_uid
    stmt = select(User).where(User.email == NEW_USER_EMAIL)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    assert user is not None
    assert user.firebase_uid == f"placeholder_{NEW_USER_EMAIL}"

    # Step 2: Simulate JIT Auth Login. When the user logs in, get_db_user_from_claims is triggered.
    merged_user = await get_db_user_from_claims(NEW_USER_CLAIMS, db)
    
    # Verify the user record has been updated to use the real Firebase UID
    assert merged_user.id == user.id
    assert merged_user.firebase_uid == NEW_USER_CLAIMS["uid"]


@pytest.mark.anyio
async def test_cancel_quotation_success(db: AsyncSession, cleanup_test_data):
    # 1. Override auth to admin to raise quotation
    app.dependency_overrides[get_current_user] = lambda: ADMIN_CLAIMS

    zero_uuid = "00000000-0000-0000-0000-000000000000"
    payload = {
        "email": NEW_USER_EMAIL,
        "number_of_ads": 5,
        "price_per_ad": 799,
        "validity_days": 10,
        "include_setup": True,
        "setup_price": 1999,
        "include_creative": False,
        "creative_price": 0
    }
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(f"/api/v1/admin/users/{zero_uuid}/raise-quotation", json=payload)
        assert res.status_code == 200
        quote_id = res.json()["quotation_id"]

    # 2. Set auth to new user to cancel the quotation
    app.dependency_overrides[get_current_user] = lambda: NEW_USER_CLAIMS

    # Run JIT login so standard client exists and can cancel it
    await get_db_user_from_claims(NEW_USER_CLAIMS, db)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_cancel = await ac.post(f"/api/v1/ads-service/quotations/{quote_id}/cancel")
        
    app.dependency_overrides.pop(get_current_user, None)

    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "success"

    # 3. Verify status in database
    stmt_q = select(ServiceQuotation).where(ServiceQuotation.id == uuid.UUID(quote_id))
    res_db = await db.execute(stmt_q)
    quote = res_db.scalar_one()
    assert quote.status == "cancelled"

    stmt_req = select(MetaAdServiceRequest).where(MetaAdServiceRequest.id == quote.service_request_id)
    res_req = await db.execute(stmt_req)
    req = res_req.scalar_one()
    assert req.status == "cancelled"


@pytest.mark.anyio
async def test_multiple_active_promo_quotations_prevention(db: AsyncSession, cleanup_test_data):
    from app.services.ads_service_eligibility import calculate_quotation
    
    # 1. Create a user
    user = await get_db_user_from_claims(NEW_USER_CLAIMS, db)
    user.intro_offer_eligible = True
    user.intro_offer_used = False
    db.add(user)
    await db.commit()

    # 2. Create service request 1
    req1 = MetaAdServiceRequest(
        user_id=user.id,
        status="draft",
        full_name="User 1",
        business_name="Biz 1",
        email=NEW_USER_EMAIL,
        whatsapp_number="123",
        business_location="India",
        industry="Ecommerce",
        advertised_product="Product 1",
        campaign_objective="Sales",
        daily_budget="1000",
        number_of_ads=1,
        creative_required=False,
    )
    db.add(req1)
    await db.commit()
    await db.refresh(req1)

    # Calculate quotation 1
    quote1_data = await calculate_quotation(db, user, req1)
    # Verify quotation 1 has the promo item
    has_promo1 = any(item.get("service_type") == "ad_management_promo" for item in quote1_data["items"])
    assert has_promo1 is True

    # Save quotation 1 in database as pending
    quote1 = ServiceQuotation(
        user_id=user.id,
        service_request_id=req1.id,
        regular_total=quote1_data["regular_total"],
        discount_total=quote1_data["discount_total"],
        final_total=quote1_data["final_total"],
        items=quote1_data["items"],
        status="pending",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(quote1)
    await db.commit()

    # 3. Create service request 2
    req2 = MetaAdServiceRequest(
        user_id=user.id,
        status="draft",
        full_name="User 1",
        business_name="Biz 2",
        email=NEW_USER_EMAIL,
        whatsapp_number="123",
        business_location="India",
        industry="Ecommerce",
        advertised_product="Product 2",
        campaign_objective="Sales",
        daily_budget="1000",
        number_of_ads=1,
        creative_required=False,
    )
    db.add(req2)
    await db.commit()
    await db.refresh(req2)

    # Calculate quotation 2 while quote1 is pending
    quote2_data = await calculate_quotation(db, user, req2)
    # Verify quotation 2 DOES NOT have the promo item (since quote1 is pending)
    has_promo2 = any(item.get("service_type") == "ad_management_promo" for item in quote2_data["items"])
    assert has_promo2 is False

    # 4. Cancel quotation 1
    quote1.status = "cancelled"
    db.add(quote1)
    await db.commit()

    # Calculate quotation 2 again
    quote2_data_after_cancel = await calculate_quotation(db, user, req2)
    # Verify quotation 2 NOW has the promo item
    has_promo2_after = any(item.get("service_type") == "ad_management_promo" for item in quote2_data_after_cancel["items"])
    assert has_promo2_after is True


@pytest.mark.anyio
async def test_lifetime_promo_limit_per_email(db: AsyncSession, cleanup_test_data):
    from app.services.ads_service_eligibility import calculate_quotation

    # 1. Create User and mark their intro offer as used
    user = await get_db_user_from_claims(NEW_USER_CLAIMS, db)
    user.intro_offer_eligible = True
    user.intro_offer_used = True  # Used!
    db.add(user)
    await db.commit()

    # 2. Create request
    req = MetaAdServiceRequest(
        user_id=user.id,
        status="draft",
        full_name="User",
        business_name="Biz",
        email=NEW_USER_EMAIL,
        whatsapp_number="123",
        business_location="India",
        industry="Ecommerce",
        advertised_product="Product",
        campaign_objective="Sales",
        daily_budget="1000",
        number_of_ads=1,
        creative_required=False,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # 3. Calculate quotation
    quote_data = await calculate_quotation(db, user, req)
    # Verify user does NOT get the promo because intro_offer_used is True
    has_promo = any(item.get("service_type") == "ad_management_promo" for item in quote_data["items"])
    assert has_promo is False


@pytest.mark.anyio
async def test_admin_split_orders(db: AsyncSession, cleanup_test_data):
    from app.api.v1.ads_service import build_orders_for_request

    # 1. Create a User
    user = await get_db_user_from_claims(NEW_USER_CLAIMS, db)

    # 2. Create a paid service request with 3 ads, requiring account setup and creative design
    req = MetaAdServiceRequest(
        user_id=user.id,
        status="whatsapp_pending",
        full_name="Vikram Wadkar",
        business_name="Suvi Biz",
        email=NEW_USER_EMAIL,
        whatsapp_number="8237378119",
        business_location="India",
        industry="Technology",
        advertised_product="Split Product Test",
        campaign_objective="Leads",
        daily_budget="1500",
        number_of_ads=3,
        meta_account_exists=False,  # Should generate Setup Add-on Order
        creative_required=True,     # Should generate Creative Add-on Order
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # 3. Create a paid quotation for this request to match the orders definition
    quote = ServiceQuotation(
        user_id=user.id,
        service_request_id=req.id,
        regular_total=1000,
        discount_total=0,
        final_total=1000,
        items=[
            {"service_type": "ad_management_standard", "price": 500},
            {"service_type": "account_setup", "price": 250},
            {"service_type": "creative_design", "price": 250}
        ],
        status="paid",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(quote)
    await db.commit()

    # 4. Generate split orders
    orders = await build_orders_for_request(req, db)
    
    # We expect: 3 ad orders + 1 account setup order + 1 creative design order = 5 orders in total!
    assert len(orders) == 5

    ad_orders = [o for o in orders if o["order_type"] == "ad"]
    setup_orders = [o for o in orders if o["order_type"] == "addon_setup"]
    creative_orders = [o for o in orders if o["order_type"] == "addon_creative"]

    assert len(ad_orders) == 3
    assert len(setup_orders) == 1
    assert len(creative_orders) == 1

    # Verify ID structure and contents
    from app.api.v1.ads_service import get_custom_id_for_request
    custom_id = await get_custom_id_for_request(req, db)
    assert ad_orders[0]["id"] == f"{custom_id}-ad-1"
    assert ad_orders[0]["business_name"] == "Suvi Biz"
    assert setup_orders[0]["id"] == f"{custom_id}-setup"
    assert creative_orders[0]["id"] == f"{custom_id}-creative"


@pytest.mark.anyio
async def test_public_quotation_checkout_and_payment_flow(db: AsyncSession, cleanup_test_data):
    # 1. Create a placeholder MetaAdServiceRequest & ServiceQuotation
    req = MetaAdServiceRequest(
        user_id=uuid.uuid4(),  # temporary parent uuid
        status="pending",
        full_name="Suvi Guest",
        business_name="Suvi Guest Studio",
        email="suviguest@example.com",
        whatsapp_number="8237378119",
        business_location="India",
        industry="Ecommerce",
        advertised_product="Soap",
        campaign_objective="Leads",
        daily_budget="1000",
        number_of_ads=1,
        meta_account_exists=True,
        creative_required=False,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    quote = ServiceQuotation(
        user_id=uuid.uuid4(),  # temporary parent uuid
        service_request_id=req.id,
        regular_total=50000,
        discount_total=0,
        final_total=50000,
        items=[
            {"service_name": "Meta Ads Management Promo", "service_type": "ad_management_promo", "offer_price": 50000}
        ],
        status="pending",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(quote)
    await db.commit()
    await db.refresh(quote)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Step 2: Get quotation details publicly (without auth)
        get_res = await ac.get(f"/api/v1/ads-service/public/quotations/{quote.id}")
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["amount"] == 50000
        assert data["email"] == "suviguest@example.com"

        # Step 3: Run guest checkout with a new email to create a new user account JIT
        checkout_payload = {
            "email": NEW_USER_EMAIL,
            "name": "Suvi Paid User",
            "phone": "9876543210"
        }
        chk_res = await ac.post(f"/api/v1/ads-service/public/quotations/{quote.id}/checkout", json=checkout_payload)
        assert chk_res.status_code == 200
        chk_data = chk_res.json()
        assert chk_data["amount"] == 50000
        assert "order_id" in chk_data
        assert chk_data["is_mock"] is True

        # Verify database changes: user should exist with the guest email
        stmt_user = select(User).where(User.email == NEW_USER_EMAIL)
        res_user = await db.execute(stmt_user)
        new_user = res_user.scalar_one_or_none()
        assert new_user is not None
        assert new_user.name == "Suvi Paid User"

        # Step 4: Verify Payment publicly
        verify_payload = {
            "razorpay_order_id": chk_data["order_id"],
            "razorpay_payment_id": "pay_mock_test_123",
            "razorpay_signature": "signature_mock_test_123",
            "email": NEW_USER_EMAIL,
            "name": "Suvi Paid User",
            "phone": "9876543210"
        }
        v_res = await ac.post(f"/api/v1/ads-service/public/quotations/{quote.id}/verify-payment", json=verify_payload)
        assert v_res.status_code == 200
        v_data = v_res.json()
        assert v_data["status"] == "success"

        # Step 5: Check database side effects after payment
        await db.refresh(quote)
        await db.refresh(req)
        await db.refresh(new_user)

        assert quote.status == "paid"
        assert quote.user_id == new_user.id
        assert req.status == "whatsapp_pending"
        assert req.user_id == new_user.id
        assert new_user.intro_offer_used is True

        # Clean up database
        await db.delete(quote)
        await db.delete(req)
        await db.commit()


