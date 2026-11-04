"""
Store Email Service - Multi-Tenant Transactional Email Engine for Digital Growth Studio.
Supports:
1. Tier 1: Platform-Managed System (Zero Setup) via Brevo API / Platform SMTP with vendor branding & reply-to.
2. Tier 2: Custom SMTP / Business Email Connection configured by professional vendors.

The 5 Core Automated Notification Emails:
1. Account Created (Welcome & Store Hub Link)
2. Password Created / Updated (Security Confirmation)
3. Forgot Password (6-Digit Secure Verification OTP)
4. Order Placed (Itemized Invoice to Customer & Alert to Vendor)
5. Order Dispatched / Shipped (Tracking Link, Courier Name, AWB Number)
"""

import asyncio
import os
import smtplib
import structlog
import urllib.request
import json
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Tuple, List, Any
from datetime import datetime, timezone
from app.config import get_settings

logger = structlog.get_logger(__name__)


def _send_custom_smtp_blocking(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    from_name: str,
    from_email: str,
    reply_to: Optional[str],
    to_email: str,
    subject: str,
    html_content: str,
) -> Tuple[bool, Optional[str]]:
    """Dispatches email via vendor-configured custom SMTP server."""
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        if reply_to:
            msg["Reply-To"] = reply_to

        msg.attach(MIMEText(html_content, "html", "utf-8"))

        port = int(smtp_port)
        if port == 465:
            server = smtplib.SMTP_SSL(smtp_host, port, timeout=12)
        else:
            server = smtplib.SMTP(smtp_host, port, timeout=12)
            server.starttls()

        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.close()
        logger.info("custom_smtp_email_sent_successfully", host=smtp_host, to=to_email, subject=subject)
        return True, None
    except Exception as e:
        err_msg = str(e)
        logger.error("custom_smtp_delivery_failed", error=err_msg, host=smtp_host, to=to_email)
        return False, err_msg


def _send_platform_brevo_api_blocking(
    api_key: str,
    from_name: str,
    from_email: str,
    reply_to: Optional[str],
    to_email: str,
    subject: str,
    html_content: str,
) -> Tuple[bool, Optional[str]]:
    """Sends email via Brevo v3 REST API with vendor branding and reply-to."""
    url = "https://api.brevo.com/v3/smtp/email"
    payload: dict = {
        "sender": {
            "name": from_name,
            "email": from_email,
        },
        "to": [
            {
                "email": to_email,
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
    }
    if reply_to:
        payload["replyTo"] = {
            "name": from_name,
            "email": reply_to,
        }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            if response.status in (200, 201, 202):
                logger.info("brevo_store_email_sent", to=to_email, store=from_name, subject=subject)
                return True, None
            else:
                return False, f"Brevo API returned HTTP {response.status}"
    except Exception as e:
        err_msg = str(e)
        if hasattr(e, "read"):
            try:
                err_msg += f" - {e.read().decode('utf-8')}"
            except Exception:
                pass
        logger.error("brevo_store_email_failed", error=err_msg, to=to_email)
        return False, err_msg


class StoreEmailService:
    @classmethod
    async def dispatch(
        cls,
        store: Any,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Dispatches email to recipient based on store's email configuration.
        Falls back to platform relay if custom SMTP is unconfigured.
        """
        if not to_email or "@" not in to_email:
            return False, "Invalid destination email address"

        if hasattr(store, "email_notifications_enabled") and store.email_notifications_enabled is False:
            logger.info("store_email_notifications_disabled", store_name=getattr(store, "store_name", "store"))
            return True, None

        store_name = getattr(store, "store_name", "Store")
        reply_to = getattr(store, "contact_email", None) or getattr(store, "smtp_from_email", None)

        # Check if Tier 2 (Custom SMTP) is active and configured
        if (
            getattr(store, "email_provider", "PLATFORM") == "CUSTOM_SMTP"
            and getattr(store, "smtp_host", None)
            and getattr(store, "smtp_user", None)
            and getattr(store, "smtp_password", None)
        ):
            from_name = getattr(store, "smtp_from_name", None) or store_name
            from_email = getattr(store, "smtp_from_email", None) or getattr(store, "smtp_user", None)
            return await asyncio.to_thread(
                _send_custom_smtp_blocking,
                store.smtp_host,
                int(store.smtp_port or 587),
                store.smtp_user,
                store.smtp_password,
                from_name,
                from_email,
                reply_to,
                to_email,
                subject,
                html_content,
            )

        # Default: Tier 1 Platform-Managed Engine
        settings = get_settings()
        brevo_key = os.environ.get("BREVO_API_KEY") or settings.SMTP_PASSWORD
        platform_from = settings.SMTP_FROM or "no-reply@digitalgrowthstudio.in"

        if brevo_key and (brevo_key.startswith("xkeysib-") or brevo_key.startswith("xsmtpsib-")):
            return await asyncio.to_thread(
                _send_platform_brevo_api_blocking,
                brevo_key,
                store_name,
                platform_from,
                reply_to,
                to_email,
                subject,
                html_content,
            )

        # Fallback to Platform SMTP
        smtp_host = settings.SMTP_HOST or "smtp-relay.brevo.com"
        smtp_port = int(settings.SMTP_PORT or 587)
        smtp_user = settings.SMTP_USER
        smtp_password = settings.SMTP_PASSWORD

        if smtp_user and smtp_password:
            return await asyncio.to_thread(
                _send_custom_smtp_blocking,
                smtp_host,
                smtp_port,
                smtp_user,
                smtp_password,
                store_name,
                platform_from,
                reply_to,
                to_email,
                subject,
                html_content,
            )

        logger.warning("no_email_gateway_configured_on_platform")
        return False, "No active email gateway configured on platform"

    # ─────────────────────────────────────────────────────────────
    # Automated Email 1: Account Created (Customer Welcome)
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_customer_welcome_email(
        cls,
        store: Any,
        customer: Any,
        store_url: Optional[str] = None,
    ) -> bool:
        if not customer.email:
            return False

        store_name = getattr(store, "store_name", "Our Store")
        accent_color = getattr(store, "primary_color", "#2563EB") or "#2563EB"
        hub_url = f"{store_url}/account" if store_url else "#"

        subject = f"Welcome to {store_name}! Your Customer Account is Ready 🎉"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: {accent_color}; padding: 28px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">{store_name}</h1>
              <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Welcome to our official shopper family!</p>
            </div>
            <div style="padding: 28px 24px;">
              <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0f172a;">Hello {customer.name or 'Shopper'},</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
                Your personal customer account has been created successfully. You can now track your shipments in real-time, view order history, and enjoy fast 1-click checkouts on <strong>{store_name}</strong>.
              </p>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 0 0 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Your Account Credentials</div>
                <div style="font-size: 14px; color: #1e293b; margin-bottom: 4px;"><strong>Registered Mobile:</strong> +91 {customer.phone}</div>
                <div style="font-size: 14px; color: #1e293b;"><strong>Registered Email:</strong> {customer.email}</div>
              </div>
              <div style="text-align: center; margin: 28px 0;">
                <a href="{hub_url}" style="background: {accent_color}; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Open Customer Hub & Track Orders →
                </a>
              </div>
              <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 24px 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                If you have any questions, reach out to <strong>{store_name}</strong> at {getattr(store, 'contact_email', '') or getattr(store, 'contact_phone', '')}.
              </p>
            </div>
          </div>
        </body>
        </html>
        """
        ok, _ = await cls.dispatch(store, customer.email, subject, html)
        return ok

    # ─────────────────────────────────────────────────────────────
    # Automated Email 2: Password Created / Changed (Security Notice)
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_password_changed_email(
        cls,
        store: Any,
        customer: Any,
    ) -> bool:
        if not customer.email:
            return False

        store_name = getattr(store, "store_name", "Our Store")
        accent_color = getattr(store, "primary_color", "#2563EB") or "#2563EB"
        now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M %p UTC")

        subject = f"Security Alert: Your {store_name} password was updated"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800;">{store_name} — Account Security</h1>
            </div>
            <div style="padding: 28px 24px;">
              <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0f172a;">Password Updated Successfully</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
                Hello <strong>{customer.name or 'Shopper'}</strong>,<br>
                This email confirms that the password for your customer account linked to mobile number <strong>+91 {customer.phone}</strong> was set or updated on <strong>{now_str}</strong>.
              </p>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px; margin: 0 0 20px; color: #065f46; font-size: 13px;">
                🔒 <strong>Account Protected:</strong> Your future orders and personal delivery addresses require this password to sign in.
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0;">
                If you initiated this change, you can safely ignore this email.<br>
                <em>If you did not request this update, please contact {store_name} support immediately at {getattr(store, 'contact_email', '') or getattr(store, 'contact_phone', '')}.</em>
              </p>
            </div>
          </div>
        </body>
        </html>
        """
        ok, _ = await cls.dispatch(store, customer.email, subject, html)
        return ok

    # ─────────────────────────────────────────────────────────────
    # Automated Email 3: Forgot Password (6-Digit OTP)
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_password_reset_otp_email(
        cls,
        store: Any,
        customer: Any,
        otp: str,
    ) -> bool:
        if not customer.email:
            return False

        store_name = getattr(store, "store_name", "Our Store")
        accent_color = getattr(store, "primary_color", "#2563EB") or "#2563EB"

        subject = f"{otp} is your {store_name} password reset verification code"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: {accent_color}; padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800;">{store_name}</h1>
              <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Password Reset Request</p>
            </div>
            <div style="padding: 28px 24px; text-align: center;">
              <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px; color: #0f172a;">Password Verification Code</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 20px;">
                Use the 6-digit code below to verify your identity and set a new password for your account (+91 {customer.phone}).
              </p>
              <div style="background: #f8fafc; border: 2px dashed {accent_color}; border-radius: 14px; padding: 18px 24px; display: inline-block; margin: 0 auto 20px;">
                <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: {accent_color};">{otp}</span>
              </div>
              <p style="font-size: 12px; color: #64748b; margin: 0 0 16px;">
                ⏰ This verification code is valid for <strong>15 minutes</strong>.
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin: 16px 0 0; border-top: 1px solid #f1f5f9; padding-top: 14px;">
                If you did not request a password reset, please ignore this email. Your password remains unchanged.
              </p>
            </div>
          </div>
        </body>
        </html>
        """
        ok, _ = await cls.dispatch(store, customer.email, subject, html)
        return ok

    # ─────────────────────────────────────────────────────────────
    # Automated Email 4: Order Placed (Itemized Bill to Customer & Alert to Vendor)
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_order_placed_emails(
        cls,
        store: Any,
        order: Any,
        items: List[Any],
        store_url: Optional[str] = None,
    ) -> bool:
        store_name = getattr(store, "store_name", "Our Store")
        accent_color = getattr(store, "primary_color", "#2563EB") or "#2563EB"
        tracking_url = f"{store_url}/order/{order.id}" if store_url else "#"

        # Build items table rows
        rows_html = ""
        subtotal_val = sum((getattr(it, "unit_price", 0.0) * getattr(it, "quantity", 1)) for it in items) if items else getattr(order, "total_amount", 0.0)
        shipping_val = getattr(order, "shipping_charge", 0.0) if hasattr(order, "shipping_charge") else (getattr(order, "total_amount", 0.0) - subtotal_val if getattr(order, "total_amount", 0.0) > subtotal_val else 0.0)
        for it in items:
            name = getattr(it, "product_name", "Item")
            qty = getattr(it, "quantity", 1)
            unit_price = getattr(it, "unit_price", 0.0)
            total = getattr(it, "total", unit_price * qty)
            variant = getattr(it, "variant_name", None)
            var_text = f"<br><small style='color: #64748b;'>Option: {variant}</small>" if variant else ""
            rows_html += f"""
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b;">
                <strong>{name}</strong>{var_text}
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; text-align: center;">
                {qty}
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; text-align: right; font-family: monospace;">
                ₹{total:,.2f}
              </td>
            </tr>
            """

        customer_subject = f"Order Confirmed #{order.order_number} from {store_name} 🎉"
        customer_html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: {accent_color}; padding: 26px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800;">{store_name}</h1>
              <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.95;">Thank you for your order!</p>
            </div>
            <div style="padding: 28px 24px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
                <div>
                  <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Order Number</div>
                  <div style="font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace;">#{order.order_number}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Payment</div>
                  <div style="font-size: 14px; font-weight: 700; color: #0f172a;">{order.payment_method} ({order.payment_status})</div>
                </div>
              </div>

              <!-- Order Items Table -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 700;">
                    <th style="padding: 8px 12px; text-align: left;">Product</th>
                    <th style="padding: 8px 12px; text-align: center;">Qty</th>
                    <th style="padding: 8px 12px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows_html}
                </tbody>
              </table>

              <!-- Totals -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
                  <span>Subtotal:</span>
                  <span style="font-family: monospace;">₹{subtotal_val:,.2f}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
                  <span>Shipping:</span>
                  <span style="font-family: monospace;">{"FREE" if shipping_val == 0 else f"₹{shipping_val:,.2f}"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px;">
                  <span>Grand Total:</span>
                  <span style="font-family: monospace; color: {accent_color};">₹{order.total_amount:,.2f}</span>
                </div>
              </div>

              <!-- Delivery Address -->
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px;">Delivery Destination</div>
                <div style="font-size: 14px; font-weight: 700; color: #1e293b;">{order.customer_name} (+91 {order.customer_phone})</div>
                <div style="font-size: 13px; color: #475569; margin-top: 2px;">{order.shipping_address}</div>
                <div style="font-size: 12px; color: #059669; font-weight: 600; margin-top: 6px;">
                  📦 Estimated Delivery: {getattr(store, 'estimated_delivery_days', '3-5 Business Days')}
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="{tracking_url}" style="background: {accent_color}; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Track Order Online →
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
        """

        # Dispatch to customer
        if order.customer_email:
            await cls.dispatch(store, order.customer_email, customer_subject, customer_html)

        # Dispatch alert to vendor
        vendor_email = getattr(store, "contact_email", None)
        if vendor_email:
            vendor_subject = f"🔔 New Order Received: #{order.order_number} (₹{order.total_amount:,.2f})"
            vendor_html = f"""
            <div style="font-family: sans-serif; padding: 18px; color: #1e293b;">
              <h2 style="color: #0f172a;">New Order #{order.order_number}</h2>
              <p>You have received a new order for <strong>₹{order.total_amount:,.2f}</strong> on {store_name}.</p>
              <p><strong>Customer:</strong> {order.customer_name} (+91 {order.customer_phone})</p>
              <p><strong>Payment:</strong> {order.payment_method}</p>
              <p><strong>Shipping Address:</strong> {order.shipping_address}</p>
              <p><a href="https://digitalgrowthstudio.in/app/dashboard/orders" style="display:inline-block; padding:10px 20px; background:#2563EB; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">Open Orders in Vendor Dashboard →</a></p>
            </div>
            """
            await cls.dispatch(store, vendor_email, vendor_subject, vendor_html)

        return True

    # ─────────────────────────────────────────────────────────────
    # Automated Email 5: Order Dispatched / Shipped (Live Tracking & AWB)
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_order_shipped_email(
        cls,
        store: Any,
        order: Any,
        store_url: Optional[str] = None,
    ) -> bool:
        if not order.customer_email:
            return False

        store_name = getattr(store, "store_name", "Our Store")
        accent_color = getattr(store, "primary_color", "#2563EB") or "#2563EB"
        courier = getattr(order, "courier_name", "Express Courier") or "Express Courier"
        tracking_num = getattr(order, "tracking_number", None) or "Pending Assignment"
        tracking_link = getattr(order, "tracking_url", None) or (f"{store_url}/order/{order.id}" if store_url else "#")

        subject = f"🚚 Dispatched: Your order #{order.order_number} is on the way!"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: {accent_color}; padding: 26px 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800;">{store_name}</h1>
              <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.95;">Shipment Out for Delivery</p>
            </div>
            <div style="padding: 28px 24px;">
              <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 10px; color: #0f172a;">Good news, {order.customer_name}!</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                Your package for Order <strong>#{order.order_number}</strong> has been handed over to our delivery partner and is en route to your shipping address.
              </p>

              <!-- Dispatch Logistics Box -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
                <div style="margin-bottom: 10px;">
                  <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Logistics Courier Partner</span>
                  <span style="font-size: 15px; font-weight: 800; color: #0f172a;">{courier}</span>
                </div>
                <div>
                  <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Tracking AWB Number</span>
                  <span style="font-size: 15px; font-weight: 800; color: {accent_color}; font-family: monospace;">{tracking_num}</span>
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="{tracking_link}" style="background: {accent_color}; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Track Live Shipment Status →
                </a>
              </div>

              <div style="background: #ffffff; border: 1px solid #f1f5f9; border-radius: 10px; padding: 12px 16px; margin-top: 18px; font-size: 12px; color: #64748b;">
                <strong>Shipping To:</strong> {order.shipping_address}
              </div>
            </div>
          </div>
        </body>
        </html>
        """
        ok, _ = await cls.dispatch(store, order.customer_email, subject, html)
        return ok

    # ─────────────────────────────────────────────────────────────
    # Diagnostic: Send Test Email
    # ─────────────────────────────────────────────────────────────
    @classmethod
    async def send_test_email(
        cls,
        store: Any,
        test_to_email: str,
    ) -> Tuple[bool, Optional[str]]:
        store_name = getattr(store, "store_name", "Our Store")
        provider = getattr(store, "email_provider", "PLATFORM")
        now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %I:%M:%S %p UTC")

        subject = f"✅ Test Notification Email from {store_name}"
        html = f"""
        <div style="font-family: -apple-system, sans-serif; padding: 24px; background: #f8fafc; color: #1e293b;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px;">
            <h2 style="color: #059669; margin-top: 0;">🎉 Email Engine Connected Successfully!</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">
              This test confirms that transactional notification emails for <strong>{store_name}</strong> are operating properly.
            </p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 12px; font-size: 13px; margin: 16px 0;">
              <div><strong>Engine:</strong> {provider}</div>
              <div><strong>Timestamp:</strong> {now_str}</div>
              <div><strong>Store:</strong> {store_name}</div>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
              Sent via Digital Growth Studio Ecommerce SaaS
            </p>
          </div>
        </div>
        """
        return await cls.dispatch(store, test_to_email, subject, html)

