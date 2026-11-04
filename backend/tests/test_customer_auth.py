import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.conftest import test_sessionmaker
from app.services.platform_seeder import seed_platform_database
from app.models.platform.vendor import PlatformStore
from app.models.platform.order import PlatformCustomer
from sqlalchemy import select, delete


@pytest.mark.asyncio
async def test_customer_auth_mandatory_credentials():
    test_phone = "9876543210"

    # Seed platform and clear any existing test customer
    async with test_sessionmaker() as db_session:
        await seed_platform_database(db_session)
        # Fetch ABC vendor store
        stmt = select(PlatformStore).where(PlatformStore.store_slug == "abc")
        store_abc = (await db_session.execute(stmt)).scalar_one_or_none()
        assert store_abc is not None

        # Clean existing test customer if present
        del_stmt = delete(PlatformCustomer).where(PlatformCustomer.phone == test_phone)
        await db_session.execute(del_stmt)
        await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Registration: Missing Email should return 400
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "register",
                "name": "Priya Sharma",
                "phone": test_phone,
                "email": "",
                "password": "SecurePassword123",
            },
        )
        assert res.status_code == 400
        assert "email" in res.json()["detail"].lower()

        # 2. Registration: Missing Password should return 400
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "register",
                "name": "Priya Sharma",
                "phone": test_phone,
                "email": "priya@example.com",
                "password": "",
            },
        )
        assert res.status_code == 400
        assert "password" in res.json()["detail"].lower()

        # 3. Registration: Short Password (< 6 chars) should return 400
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "register",
                "name": "Priya Sharma",
                "phone": test_phone,
                "email": "priya@example.com",
                "password": "123",
            },
        )
        assert res.status_code == 400
        assert "minimum 6" in res.json()["detail"].lower()

        # 4. Registration: Valid credentials (name, phone, email, password) should SUCCEED
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "register",
                "name": "Priya Sharma",
                "phone": test_phone,
                "email": "priya@example.com",
                "password": "SecurePassword123",
            },
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["success"] is True
        assert data["customer"]["name"] == "Priya Sharma"
        assert data["customer"]["email"] == "priya@example.com"
        assert data["customer"]["phone"] == test_phone
        assert data["token"] is not None

        # 5. Duplicate Registration with same phone should return 400
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "register",
                "name": "Priya Sharma",
                "phone": test_phone,
                "email": "priya@example.com",
                "password": "SecurePassword123",
            },
        )
        assert res.status_code == 400
        assert "already exists" in res.json()["detail"].lower()

        # 6. Login: Missing password should return 400
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "login",
                "phone": test_phone,
                "password": "",
            },
        )
        assert res.status_code == 400
        assert "password" in res.json()["detail"].lower()

        # 7. Login: Wrong password should return 401
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "login",
                "phone": test_phone,
                "password": "WrongPassword!",
            },
        )
        assert res.status_code == 401
        assert "incorrect password" in res.json()["detail"].lower()

        # 8. Login: Correct password should SUCCEED
        res = await client.post(
            "/api/store/abc/customer/auth",
            json={
                "action": "login",
                "phone": test_phone,
                "password": "SecurePassword123",
            },
        )
        assert res.status_code == 200, res.text
        login_data = res.json()
        assert login_data["success"] is True
        assert login_data["customer"]["phone"] == test_phone
        assert login_data["token"] is not None
