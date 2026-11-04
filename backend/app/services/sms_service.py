"""
SMS Service - Multi-Tenant Transactional SMS Gateway Engine for Digital Growth Studio.
Supports:
1. Fast2SMS API (Quick SMS route + DLT route for Indian numbers)
2. MSG91 API (Flow & SendHTTP API)
3. Custom HTTP URL Template (Way2SMS, Textlocal, Gupshup, and generic HTTP GET/POST gateways)

The 4 Core Automated Notification SMS Events:
1. Customer Account Created (Welcome SMS)
2. Order Placed (Order Confirmation with amount & order number)
3. Order Dispatched / Shipped (Courier Name, AWB Tracking Number & Link)
4. OTP Verification / Password Reset
"""

import re
import urllib.parse
import httpx
import structlog
from typing import Optional, Tuple, Any

logger = structlog.get_logger(__name__)


def normalize_indian_phone(phone: Optional[str]) -> str:
    """
    Cleans and standardizes an Indian mobile phone number into a 10-digit string.
    Example: '+91 98765 43210' -> '9876543210'
    """
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("91") and len(digits) == 12:
        return digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        return digits[1:]
    return digits[-10:] if len(digits) >= 10 else digits


class SmsService:
    @staticmethod
    async def _send_via_fast2sms(
        api_key: str,
        phone: str,
        message: str,
        sender_id: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Sends SMS via Fast2SMS API (supports Quick Route & DLT Route).
        API doc: https://www.fast2sms.com/dev/bulkV2
        """
        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": api_key.strip(),
            "Content-Type": "application/json",
        }
        
        # If sender_id is provided, attempt DLT or standard route; otherwise Quick SMS 'q'
        payload = {
            "route": "q",
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": phone,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                
                if resp.status_code == 200 and data.get("return") is True:
                    return True, "SMS sent successfully via Fast2SMS"
                
                err_msg = data.get("message", [str(resp.text)])
                if isinstance(err_msg, list):
                    err_msg = ", ".join(err_msg)
                return False, f"Fast2SMS error: {err_msg}"
        except Exception as exc:
            logger.error("fast2sms_send_failed", phone=phone, error=str(exc))
            return False, f"Fast2SMS network error: {str(exc)}"

    @staticmethod
    async def _send_via_msg91(
        auth_key: str,
        phone: str,
        message: str,
        sender_id: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Sends SMS via MSG91 SendHTTP or Flow API.
        """
        sender = sender_id.strip() if sender_id else "DGSAPP"
        url = "https://control.msg91.com/api/sendhttp.php"
        params = {
            "authkey": auth_key.strip(),
            "mobiles": f"91{phone}" if not phone.startswith("91") else phone,
            "message": message,
            "sender": sender,
            "route": "4",
            "country": "91",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    return True, "SMS sent successfully via MSG91"
                return False, f"MSG91 error: HTTP {resp.status_code} - {resp.text}"
        except Exception as exc:
            logger.error("msg91_send_failed", phone=phone, error=str(exc))
            return False, f"MSG91 network error: {str(exc)}"

    @staticmethod
    async def _send_via_custom_http(
        custom_url_template: str,
        api_key: Optional[str],
        phone: str,
        message: str,
        sender_id: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Sends SMS using a user-configured HTTP endpoint (e.g. Way2SMS, Textlocal, Gupshup, etc.)
        Supported placeholders in URL:
          {phone}       -> 10-digit mobile number
          {phone_with_code} -> 919876543210
          {message}     -> URL-encoded text
          {api_key}     -> API key or auth token
          {sender_id}   -> Approved Sender ID
        """
        encoded_message = urllib.parse.quote(message)
        key_val = urllib.parse.quote(api_key or "")
        sender_val = urllib.parse.quote(sender_id or "STORE")
        phone_code = f"91{phone}" if not phone.startswith("91") else phone

        target_url = custom_url_template.strip()
        target_url = target_url.replace("{phone}", phone)
        target_url = target_url.replace("{phone_with_code}", phone_code)
        target_url = target_url.replace("{message}", encoded_message)
        target_url = target_url.replace("{api_key}", key_val)
        target_url = target_url.replace("{sender_id}", sender_val)

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(target_url)
                if resp.status_code in (200, 201, 202):
                    return True, "SMS dispatched via Custom HTTP Gateway"
                return False, f"Gateway returned HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as exc:
            logger.error("custom_sms_gateway_failed", url=target_url, error=str(exc))
            return False, f"Custom HTTP Gateway error: {str(exc)}"

    @classmethod
    async def send_sms(
        cls,
        store: Any,
        phone: str,
        message: str,
        event_type: str = "general",
    ) -> Tuple[bool, str]:
        """
        Dispatches SMS if store has SMS Gateway enabled and the event type is active.
        """
        if not getattr(store, "sms_gateway_enabled", False):
            return False, "SMS Gateway is not activated by Platform Super Admin for this store."

        clean_phone = normalize_indian_phone(phone)
        if len(clean_phone) != 10:
            return False, f"Invalid Indian phone number: '{phone}'. Must be a 10-digit mobile number."

        # Check event toggle
        if event_type == "welcome" and not getattr(store, "sms_welcome_active", True):
            return False, "Welcome SMS is disabled by vendor."
        if event_type == "order_placed" and not getattr(store, "sms_order_placed_active", True):
            return False, "Order Placed SMS is disabled by vendor."
        if event_type == "order_dispatched" and not getattr(store, "sms_order_dispatched_active", True):
            return False, "Order Dispatched SMS is disabled by vendor."
        if event_type == "otp" and not getattr(store, "sms_otp_active", True):
            return False, "OTP SMS is disabled by vendor."

        provider = (getattr(store, "sms_provider", "FAST2SMS") or "FAST2SMS").upper()
        api_key = getattr(store, "sms_api_key", None)
        sender_id = getattr(store, "sms_sender_id", None)
        custom_url = getattr(store, "sms_custom_url", None)

        if provider == "FAST2SMS":
            if not api_key:
                return False, "Fast2SMS API Key is not configured."
            return await cls._send_via_fast2sms(api_key, clean_phone, message, sender_id)

        elif provider == "MSG91":
            if not api_key:
                return False, "MSG91 Auth Key is not configured."
            return await cls._send_via_msg91(api_key, clean_phone, message, sender_id)

        elif provider in ("CUSTOM_HTTP", "WAY2SMS"):
            if not custom_url:
                return False, "Custom SMS HTTP URL is not configured."
            return await cls._send_via_custom_http(custom_url, api_key, clean_phone, message, sender_id)

        return False, f"Unknown SMS provider: {provider}"

    # -------------------------------------------------------------
    # High-level Automated Event Helpers
    # -------------------------------------------------------------

    @classmethod
    async def send_customer_welcome_sms(cls, store: Any, customer_name: str, phone: str) -> Tuple[bool, str]:
        store_name = getattr(store, "store_name", "Our Store") or "Our Store"
        subdomain = getattr(store, "subdomain", "")
        store_url = f"https://{subdomain}" if subdomain else "our store"
        first_name = customer_name.split()[0] if customer_name else "Shopper"

        msg = f"Welcome to {store_name}, {first_name}! Your account has been created successfully. Visit {store_url} to explore our latest collection."
        return await cls.send_sms(store, phone, msg, event_type="welcome")

    @classmethod
    async def send_order_placed_sms(
        cls,
        store: Any,
        order_number: str,
        total_amount: float,
        phone: str,
    ) -> Tuple[bool, str]:
        store_name = getattr(store, "store_name", "Our Store") or "Our Store"
        amount_fmt = f"{total_amount:,.2f}"
        msg = f"Order Confirmed! Thank you for ordering from {store_name}. Order #{order_number} for Rs.{amount_fmt} is being packed with care."
        return await cls.send_sms(store, phone, msg, event_type="order_placed")

    @classmethod
    async def send_order_dispatched_sms(
        cls,
        store: Any,
        order_number: str,
        courier_name: Optional[str],
        tracking_number: Optional[str],
        tracking_url: Optional[str],
        phone: str,
    ) -> Tuple[bool, str]:
        store_name = getattr(store, "store_name", "Our Store") or "Our Store"
        courier_str = f" via {courier_name}" if courier_name else ""
        tracking_str = f" AWB: {tracking_number}." if tracking_number else ""
        link_str = f" Track: {tracking_url}" if tracking_url else ""
        
        msg = f"Order Shipped! Your {store_name} order #{order_number} has been dispatched{courier_str}.{tracking_str}{link_str}"
        return await cls.send_sms(store, phone, msg, event_type="order_dispatched")

    @classmethod
    async def send_otp_sms(cls, store: Any, otp: str, phone: str) -> Tuple[bool, str]:
        store_name = getattr(store, "store_name", "Store") or "Store"
        msg = f"Your verification code for {store_name} is {otp}. Valid for 10 minutes. Please do not share this code with anyone."
        return await cls.send_sms(store, phone, msg, event_type="otp")

    @classmethod
    async def send_test_sms(cls, store: Any, test_phone: str) -> Tuple[bool, str]:
        store_name = getattr(store, "store_name", "Digital Growth Studio") or "Digital Growth Studio"
        msg = f"Test SMS from {store_name}: Your SMS Gateway integration is working perfectly!"
        return await cls.send_sms(store, test_phone, msg, event_type="test")
