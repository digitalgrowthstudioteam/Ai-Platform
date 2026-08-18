"""
Digital Growth Studio — Authentication Tests
"""
import pytest
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_auth_me_no_token():
    """Verify that accessing /me without an auth token returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


@pytest.mark.asyncio
async def test_auth_me_invalid_token():
    """Verify that an invalid auth token returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Pass a dummy token
        headers = {"Authorization": "Bearer invalid_token_here"}
        
        with patch("app.dependencies.verify_firebase_token", return_value=None):
            response = await client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code == 401
            assert "Invalid or expired" in response.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_success():
    """Verify that a valid token returns the user's profile successfully."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"Authorization": "Bearer mock_valid_token"}
        mock_claims = {
            "uid": "mock_firebase_uid_123",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "https://example.com/pic.png"
        }
        
        with patch("app.dependencies.verify_firebase_token", return_value=mock_claims):
            response = await client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["uid"] == "mock_firebase_uid_123"
            assert data["email"] == "test@example.com"
            assert data["name"] == "Test User"
            assert data["picture"] == "https://example.com/pic.png"
