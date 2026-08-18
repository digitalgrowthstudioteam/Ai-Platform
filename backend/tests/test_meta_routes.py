"""
Digital Growth Studio — Meta Connection Router Tests
"""
import pytest
import respx
import httpx
from unittest.mock import patch
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.config import get_settings
from app.dependencies import get_current_user
from app.models.user import User
from app.models.meta import MetaConnection, MetaAdAccount

settings = get_settings()

# Mock user claims
MOCK_CLAIMS = {
    "uid": "mock_firebase_uid_meta_123",
    "email": "meta_test@example.com",
    "name": "Meta Test User",
}


@pytest.fixture
def mock_auth():
    """Mock the get_current_user dependency and verify_firebase_token function."""
    app.dependency_overrides[get_current_user] = lambda: MOCK_CLAIMS
    with patch("app.api.v1.meta.verify_firebase_token") as mock_verify:
        mock_verify.return_value = MOCK_CLAIMS
        yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_connect_redirect(mock_auth):
    """Verify that /connect endpoint redirects to Facebook's OAuth URL."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Pass a mock query token to connect
        response = await client.get("/api/v1/meta/connect?token=mock_token", follow_redirects=False)
        assert response.status_code == 307
        location = response.headers["location"]
        assert "facebook.com" in location
        assert f"client_id={settings.META_APP_ID}" in location
        assert "scope=ads_read,read_insights" in location


@pytest.mark.asyncio
@respx.mock
async def test_oauth_callback(db: AsyncSession):
    """Verify that /callback endpoint exchanges auth code and creates MetaConnection."""
    # Pre-create our mock user in DB (first clear any leftovers)
    await db.execute(delete(User).where(User.email == MOCK_CLAIMS["email"]))
    await db.commit()

    user = User(
        firebase_uid=MOCK_CLAIMS["uid"],
        email=MOCK_CLAIMS["email"],
        name=MOCK_CLAIMS["name"],
        trial_status="active",
        trial_started_at=datetime.utcnow(),
        trial_ends_at=datetime.utcnow() + timedelta(days=7),
        trial_used=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 1. Mock short-lived token exchange API request
    respx.get(
        f"https://graph.facebook.com/{settings.META_API_VERSION}/oauth/access_token",
        params={"code": "auth_code_123"}
    ).mock(return_value=httpx.Response(200, json={"access_token": "short_lived_token"}))

    # 2. Mock long-lived token exchange API request
    respx.get(
        f"https://graph.facebook.com/{settings.META_API_VERSION}/oauth/access_token",
        params={"fb_exchange_token": "short_lived_token"}
    ).mock(return_value=httpx.Response(200, json={"access_token": "mock_access_token", "expires_in": 5184000}))

    # 3. Mock /me profile API request
    respx.get(
        f"https://graph.facebook.com/{settings.META_API_VERSION}/me",
        params={"access_token": "mock_access_token"}
    ).mock(return_value=httpx.Response(200, json={"id": "meta_user_id_888", "name": "Meta Test Profile"}))

    # Trigger callback endpoint using user.id UUID as OAuth state
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/meta/callback?code=auth_code_123&state={user.id}",
            follow_redirects=False
        )
        assert response.status_code == 307
        assert "connected=success" in response.headers["location"]

        # Check that MetaConnection is created in database
        stmt = select(MetaConnection).where(MetaConnection.user_id == user.id)
        result = await db.execute(stmt)
        conn = result.scalar_one_or_none()
        assert conn is not None
        assert conn.meta_user_id == "meta_user_id_888"
        assert conn.access_token == "mock_access_token"

        # Cleanup
        await db.delete(user)
        await db.commit()


@pytest.mark.asyncio
async def test_meta_status_not_connected(mock_auth):
    """Verify that /status returns connected=False if connection doesn't exist."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/meta/status")
        assert response.status_code == 200
        assert response.json()["connected"] is False


@pytest.mark.asyncio
async def test_meta_accounts_and_selection(mock_auth, db: AsyncSession):
    """Verify listing available Meta ad accounts and selecting them."""
    # Pre-create our mock user and meta connection in DB (first clear leftovers)
    await db.execute(delete(User).where(User.email == MOCK_CLAIMS["email"]))
    await db.commit()

    user = User(
        firebase_uid=MOCK_CLAIMS["uid"],
        email=MOCK_CLAIMS["email"],
        name=MOCK_CLAIMS["name"],
        # Note: we don't start the trial initially here to test select_ad_accounts trial activation flow
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    conn = MetaConnection(
        user_id=user.id,
        meta_user_id="meta_user_id_888",
        status="connected",
        access_token="mock_access_token",
    )
    db.add(conn)
    await db.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch available accounts (uses mock bypass due to mock_access_token)
        response = await client.get("/api/v1/meta/accounts")
        assert response.status_code == 200
        accounts = response.json()
        assert len(accounts) == 3
        assert accounts[0]["id"] == "act_101010101"
        assert accounts[0]["is_connected"] is False

        # 2. Select first ad account
        payload = {"account_ids": ["act_101010101"], "industries": {"act_101010101": "Ecommerce"}}
        select_response = await client.post("/api/v1/meta/accounts/select", json=payload)
        assert select_response.status_code == 200
        assert select_response.json()["status"] == "success"

        # Check DB record for selected ad account
        stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        result = await db.execute(stmt)
        ad_acc = result.scalar_one_or_none()
        assert ad_acc is not None
        assert ad_acc.meta_account_id == "act_101010101"
        assert ad_acc.account_name == "DGS Primary Ad Account"

        # 3. Disconnect connection
        disconnect_response = await client.post("/api/v1/meta/disconnect")
        assert disconnect_response.status_code == 200
        
        # Verify cascaded deletion
        stmt = select(MetaConnection).where(MetaConnection.user_id == user.id)
        result = await db.execute(stmt)
        assert result.scalar_one_or_none() is None

        stmt = select(MetaAdAccount).where(MetaAdAccount.user_id == user.id)
        result = await db.execute(stmt)
        assert result.scalar_one_or_none() is None

        # Cleanup user
        await db.delete(user)
        await db.commit()
