import pytest
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch
from app.main import app
from app.dependencies import get_current_user
from app.models.email_config import EmailTemplateConfig
from app.services.config_seeder import seed_admin_configs
from app.services.email_service import EmailService

# Mock admin user claims
MOCK_ADMIN_CLAIMS = {
    "uid": "admin_uid_123",
    "email": "vikramrwadkar@gmail.com",
    "name": "Vikram Wadkar",
}


@pytest.fixture
def mock_admin_auth():
    """Mock the get_current_user dependency for admin."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_ADMIN_CLAIMS
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_email_templates_seeding(db):
    """
    Verifies that seeding populates all 6 required email templates in the DB.
    """
    from sqlalchemy import delete
    await db.execute(delete(EmailTemplateConfig))
    await db.commit()

    # Seed
    await seed_admin_configs(db)

    # Check
    stmt = select(EmailTemplateConfig)
    res = await db.execute(stmt)
    configs = res.scalars().all()

    assert len(configs) == 6
    keys = {c.trigger_key for c in configs}
    expected_keys = {
        "sync_completed",
        "welcome_user",
        "quotation_created",
        "payment_confirmation",
        "account_deleted",
        "team_invitation"
    }
    assert keys == expected_keys


@pytest.mark.asyncio
async def test_email_service_rendering(db):
    """
    Verifies that EmailService can format and send a seeded email template successfully.
    """
    await seed_admin_configs(db)
    
    # Trigger a sync completed email rendering check
    res = await EmailService.send_template_email(
        to_email="test@example.com",
        trigger_key="sync_completed",
        variables={
            "account_name": "Test Meta Account",
            "dashboard_link": "https://example.com/dashboard"
        },
        db=db
    )
    assert res is True  # In fallback SMTP offline mode, returns True


@pytest.mark.asyncio
async def test_admin_email_templates_endpoints(db, mock_admin_auth):
    """
    Verifies that the super admin can fetch and edit email templates via endpoints.
    """
    await seed_admin_configs(db)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET /admin/email-templates
        res = await client.get("/api/v1/admin/email-templates")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 6

        # Verify keys
        keys = [t["trigger_key"] for t in data]
        assert "sync_completed" in keys

        # 2. PUT /admin/email-templates/{trigger_key}
        update_payload = {
            "is_enabled": False,
            "subject_template": "Custom Subject for {account_name}",
            "body_template": "Custom HTML Body {dashboard_link}"
        }
        put_res = await client.put(
            "/api/v1/admin/email-templates/sync_completed",
            json=update_payload
        )
        assert put_res.status_code == 200
        updated_data = put_res.json()
        assert updated_data["is_enabled"] is False
        assert updated_data["subject_template"] == "Custom Subject for {account_name}"
        assert updated_data["body_template"] == "Custom HTML Body {dashboard_link}"

        # Verify database update
        stmt = select(EmailTemplateConfig).where(EmailTemplateConfig.trigger_key == "sync_completed")
        db_res = await db.execute(stmt)
        record = db_res.scalar_one()
        assert record.is_enabled is False
        assert record.subject_template == "Custom Subject for {account_name}"
