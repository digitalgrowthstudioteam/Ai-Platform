import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.conftest import test_sessionmaker
from app.services.platform_seeder import seed_platform_database
from app.models.platform.system import PlatformSupplierInquiry
from sqlalchemy import select

@pytest.mark.asyncio
async def test_supplier_inquiry_lifecycle():
    async with test_sessionmaker() as db_session:
        await seed_platform_database(db_session)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Validation test: Invalid phone number
        bad_res = await client.post(
            "/api/store/abc/supplier-inquiry",
            json={
                "business_name": "Test Millers Ltd",
                "contact_person": "Vikram",
                "phone": "123",  # Invalid phone
                "email": "test@millers.com",
                "city": "Bengaluru",
                "state": "Karnataka",
            },
        )
        assert bad_res.status_code == 400
        assert "Valid 10-digit mobile phone number" in bad_res.json()["detail"]

        # 2. Valid submission
        valid_res = await client.post(
            "/api/store/abc/supplier-inquiry",
            json={
                "business_name": "Sri Lakshmi Rice Mills Pvt Ltd",
                "contact_person": "Suresh Reddy",
                "phone": "9876543210",
                "email": "suresh@lakshmirice.in",
                "whatsapp_number": "9876543210",
                "business_type": "Mill / Farm Producer",
                "category": "Rice and Rice Products",
                "gstin": "29AAACL1234F1Z5",
                "fssai_license": "11223344556677",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560066",
                "monthly_capacity": "₹25 Lakhs - ₹1 Crore",
                "product_details": "Sona Masoori raw rice 25kg bags, Ponni boiled rice, Basmati 1121.",
            },
        )
        assert valid_res.status_code == 200
        data = valid_res.json()
        assert data["success"] is True
        assert "reference_id" in data
        assert "SUP-" in data["reference_id"]
        assert "submitted" in data["message"]

        # 3. Verify database record
        async with test_sessionmaker() as db:
            stmt = select(PlatformSupplierInquiry).where(
                PlatformSupplierInquiry.store_slug == "abc",
                PlatformSupplierInquiry.phone == "9876543210",
            )
            inquiry = (await db.execute(stmt)).scalars().first()
            assert inquiry is not None
            assert inquiry.business_name == "Sri Lakshmi Rice Mills Pvt Ltd"
            assert inquiry.category == "Rice and Rice Products"
            assert inquiry.status == "PENDING"
