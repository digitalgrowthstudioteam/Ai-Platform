import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.conftest import test_sessionmaker
from app.services.platform_seeder import seed_platform_database


@pytest.mark.asyncio
async def test_customer_auth_flow():
    # Seed platform database to ensure test stores exist
    async with test_sessionmaker() as db_session:
        await seed_platform_database(db_session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Test against seeded store 'abc'
        slug = "abc"

        # 1. Register a new customer
        reg_payload = {
            "action": "register",
            "phone": "9876543210",
            "name": "Priya Sharma",
            "email": "priya@example.com",
            "password": "pin1234",
        }
        res = await ac.post(f"/api/store/{slug}/customer/auth", json=reg_payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["success"] is True
        assert data["customer"]["name"] == "Priya Sharma"
        assert data["customer"]["phone"] == "9876543210"
        assert data["customer"]["email"] == "priya@example.com"
        assert data["token"] is not None

        # 2. Login the registered customer
        login_payload = {
            "action": "login",
            "phone": "9876543210",
        }
        res_login = await ac.post(f"/api/store/{slug}/customer/auth", json=login_payload)
        assert res_login.status_code == 200, res_login.text
        data_login = res_login.json()
        assert data_login["success"] is True
        assert data_login["customer"]["name"] == "Priya Sharma"
        assert data_login["customer"]["phone"] == "9876543210"

        # 3. OTP verification action
        otp_payload = {
            "action": "otp_request",
            "phone": "9876543210",
        }
        res_otp = await ac.post(f"/api/store/{slug}/customer/auth", json=otp_payload)
        assert res_otp.status_code == 200
        assert res_otp.json()["success"] is True

        # 4. Validation error for invalid phone number
        bad_payload = {
            "action": "login",
            "phone": "123",
        }
        res_bad = await ac.post(f"/api/store/{slug}/customer/auth", json=bad_payload)
        assert res_bad.status_code == 400
