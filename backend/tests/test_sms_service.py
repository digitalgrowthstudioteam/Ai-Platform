import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.sms_service import normalize_indian_phone, SmsService


def test_normalize_indian_phone():
    assert normalize_indian_phone("+91 98765 43210") == "9876543210"
    assert normalize_indian_phone("919876543210") == "9876543210"
    assert normalize_indian_phone("09876543210") == "9876543210"
    assert normalize_indian_phone("9876543210") == "9876543210"
    assert normalize_indian_phone("12345") == "12345"
    assert normalize_indian_phone(None) == ""


@pytest.mark.asyncio
async def test_send_sms_inactive_store():
    store = MagicMock()
    store.sms_gateway_enabled = False
    success, msg = await SmsService.send_sms(store, "9876543210", "Hello test")
    assert success is False
    assert "not activated by Platform Super Admin" in msg


@pytest.mark.asyncio
async def test_send_sms_custom_http_url():
    store = MagicMock()
    store.sms_gateway_enabled = True
    store.sms_provider = "CUSTOM_HTTP"
    store.sms_api_key = "secret_key_123"
    store.sms_sender_id = "WAY2SM"
    store.sms_custom_url = "https://api.way2sms.com/send?apikey={api_key}&mobile={phone}&message={message}&sender={sender_id}"
    store.sms_order_placed_active = True

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "OK"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp
        success, msg = await SmsService.send_order_placed_sms(
            store=store,
            order_number="DGS-ORD-101",
            total_amount=1499.0,
            phone="9876543210"
        )
        assert success is True
        assert "dispatched via Custom HTTP Gateway" in msg
        mock_get.assert_called_once()
        called_url = mock_get.call_args[0][0]
        assert "api.way2sms.com" in called_url
        assert "mobile=9876543210" in called_url
        assert "apikey=secret_key_123" in called_url
        assert "sender=WAY2SM" in called_url
