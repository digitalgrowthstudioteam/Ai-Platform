"""
Tests for Platform Google Auth and Super Admin Role Enforcement
"""
import pytest
import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_google_login_vikram_gets_super_admin():
    """Verify that vikramrwadkar@gmail.com is strictly granted SUPER_ADMIN."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock Firebase token verification for vikramrwadkar@gmail.com
        with patch("app.api.platform.auth.verify_firebase_token") as mock_verify:
            mock_verify.return_value = {
                "uid": "google_uid_vikram_123",
                "email": "vikramrwadkar@gmail.com",
                "name": "Vikram Wadkar",
                "email_verified": True,
            }

            resp = await client.post("/api/v1/platform/auth/google-login", json={
                "id_token": "fake_firebase_token_vikram"
            })
            assert resp.status_code == 200, f"Google login failed: {resp.text}"
            data = resp.json()
            assert data["role"] == "SUPER_ADMIN", f"Expected SUPER_ADMIN, got {data['role']}"
            assert data["email"] == "vikramrwadkar@gmail.com"
            assert "access_token" in data

            # Verify Super Admin can access admin endpoints
            admin_headers = {"Authorization": f"Bearer {data['access_token']}"}
            overview_res = await client.get("/api/v1/platform/admin/overview", headers=admin_headers)
            assert overview_res.status_code == 200, f"Super admin overview failed: {overview_res.text}"


@pytest.mark.asyncio
async def test_google_login_non_vikram_cannot_be_super_admin():
    """Verify other Google emails are never granted SUPER_ADMIN."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Mock Firebase token verification for arbitrary user
        with patch("app.api.platform.auth.verify_firebase_token") as mock_verify:
            mock_verify.return_value = {
                "uid": "google_uid_random_999",
                "email": "random_shop_owner@gmail.com",
                "name": "Random Shop Owner",
                "email_verified": True,
            }

            resp = await client.post("/api/v1/platform/auth/google-login", json={
                "id_token": "fake_firebase_token_random"
            })
            assert resp.status_code == 200, f"Google login failed: {resp.text}"
            data = resp.json()
            assert data["role"] == "VENDOR_ADMIN", f"Expected VENDOR_ADMIN, got {data['role']}"
            assert data["role"] != "SUPER_ADMIN"
            assert data["vendor_code"] is not None

            # Verify this vendor CANNOT access Super Admin endpoints
            vendor_headers = {"Authorization": f"Bearer {data['access_token']}"}
            admin_res = await client.get("/api/v1/platform/admin/overview", headers=vendor_headers)
            assert admin_res.status_code == 403, "Vendor unexpectedly accessed super admin endpoint!"

