import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.conftest import test_sessionmaker
from app.services.platform_seeder import seed_platform_database
from app.models.platform.vendor import PlatformVendor, PlatformStore
from app.models.platform.order import PlatformCustomer
from sqlalchemy import select


@pytest.mark.asyncio
async def test_email_notifications_and_google_auth_flow():
    # 1. Seed database
    async with test_sessionmaker() as db_session:
        await seed_platform_database(db_session)
        stmt = select(PlatformVendor).where(PlatformVendor.vendor_code == "VND0001")
        vendor_abc = (await db_session.execute(stmt)).scalar_one_or_none()
        assert vendor_abc is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. Vendor Login & Check Email Settings
        login_res = await client.post("/api/v1/platform/auth/login", json={
            "email": "abcfashion@digitalgrowthstudio.in",
            "password": "Vendor@123",
        })
        assert login_res.status_code == 200
        vendor_token = login_res.json()["access_token"]
        v_headers = {"Authorization": f"Bearer {vendor_token}"}

        # Check default email settings (Tier 1: Platform-Managed)
        get_email_res = await client.get("/api/v1/platform/vendor/email-settings", headers=v_headers)
        assert get_email_res.status_code == 200
        email_data = get_email_res.json()
        assert email_data["email_provider"] == "PLATFORM"
        assert email_data["email_notifications_enabled"] is True
        assert "ABC Fashion" in email_data["default_platform_sender"]

        # 3. Customer Registration -> Automated Welcome Email
        cust_reg = await client.post("/api/store/abc/customer/auth", json={
            "action": "register",
            "name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "phone": "9876501234",
            "password": "SecretPassword123",
        })
        assert cust_reg.status_code == 200
        assert cust_reg.json()["success"] is True
        assert cust_reg.json()["customer"]["phone"] == "9876501234"

        # 4. Forgot Password Flow
        forgot_res = await client.post("/api/store/abc/customer/forgot-password", json={
            "identifier": "9876501234"
        })
        assert forgot_res.status_code == 200
        assert forgot_res.json()["success"] is True
        assert "p***@example.com" in forgot_res.json()["masked_email"]

        # Read the OTP from database
        async with test_sessionmaker() as db_session:
            c_stmt = select(PlatformCustomer).where(PlatformCustomer.phone == "9876501234")
            c_db = (await db_session.execute(c_stmt)).scalar_one_or_none()
            assert c_db is not None
            assert c_db.reset_token is not None
            otp = c_db.reset_token

        # Reset password with wrong OTP -> 400
        bad_reset = await client.post("/api/store/abc/customer/reset-password", json={
            "identifier": "9876501234",
            "otp": "000000",
            "new_password": "NewSecretPassword456",
        })
        assert bad_reset.status_code == 400

        # Reset password with correct OTP -> 200
        good_reset = await client.post("/api/store/abc/customer/reset-password", json={
            "identifier": "9876501234",
            "otp": otp,
            "new_password": "NewSecretPassword456",
        })
        assert good_reset.status_code == 200
        assert good_reset.json()["success"] is True

        # Sign in with new password -> 200
        login_cust = await client.post("/api/store/abc/customer/auth", json={
            "action": "login",
            "phone": "9876501234",
            "password": "NewSecretPassword456",
        })
        assert login_cust.status_code == 200
        assert login_cust.json()["success"] is True

        # 5. Google Auth Flow (Hybrid Model)
        # First sign-in without phone number -> requires_phone = True
        google_init = await client.post("/api/store/abc/customer/google-auth", json={
            "email": "rohit.verma@gmail.com",
            "name": "Rohit Verma",
            "google_id": "google_uid_98765",
        })
        assert google_init.status_code == 200
        assert google_init.json()["requires_phone"] is True
        assert google_init.json()["prefill_name"] == "Rohit Verma"
        assert google_init.json()["prefill_email"] == "rohit.verma@gmail.com"

        # Complete Google Auth with 10-digit phone number
        google_complete = await client.post("/api/store/abc/customer/google-auth", json={
            "email": "rohit.verma@gmail.com",
            "name": "Rohit Verma",
            "google_id": "google_uid_98765",
            "phone": "9123456789",
        })
        assert google_complete.status_code == 200
        assert google_complete.json()["success"] is True
        assert google_complete.json()["customer"]["phone"] == "9123456789"
        assert google_complete.json()["token"] is not None

        # Subsequent sign-in with Google automatically logs in (phone already saved)
        google_subsequent = await client.post("/api/store/abc/customer/google-auth", json={
            "email": "rohit.verma@gmail.com",
            "name": "Rohit Verma",
            "google_id": "google_uid_98765",
        })
        assert google_subsequent.status_code == 200
        assert google_subsequent.json()["success"] is True
        assert google_subsequent.json()["customer"]["phone"] == "9123456789"

