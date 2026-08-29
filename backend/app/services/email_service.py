import asyncio
import os
import smtplib
import structlog
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings

logger = structlog.get_logger()


def _send_smtp_blocking(
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    smtp_from: str,
    to_email: str,
    subject: str,
    content: str,
    is_html: bool = False
) -> bool:
    """
    Synchronous SMTP helper executed in a worker thread with strict 10s socket timeout.
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(content, 'html' if is_html else 'plain'))

        server = smtplib.SMTP(smtp_host, int(smtp_port), timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, to_email, msg.as_string())
        server.close()
        logger.info("smtp_email_sent_successfully", to=to_email, subject=subject)
        return True
    except Exception as e:
        logger.error("smtp_delivery_failed", error=str(e), to=to_email, host=smtp_host, port=smtp_port)
        return False


class EmailService:
    @classmethod
    async def _dispatch_smtp(
        cls,
        to_email: str,
        subject: str,
        content: str,
        is_html: bool = False
    ) -> bool:
        """
        Helper method to dispatch emails via non-blocking worker thread pool.
        """
        current_settings = get_settings()

        smtp_host = current_settings.SMTP_HOST or os.environ.get("SMTP_HOST") or "smtp-relay.brevo.com"
        smtp_port = int(current_settings.SMTP_PORT or os.environ.get("SMTP_PORT") or 587)
        smtp_user = current_settings.SMTP_USER or os.environ.get("SMTP_USER")
        smtp_password = current_settings.SMTP_PASSWORD or os.environ.get("SMTP_PASSWORD")
        smtp_from = current_settings.SMTP_FROM or os.environ.get("SMTP_FROM") or "digitalgrowthstudioteam@digitalgrowthstudio.in"

        if smtp_user and smtp_password:
            logger.info("dispatching_smtp_email", to=to_email, host=smtp_host, port=smtp_port, sender=smtp_from)
            return await asyncio.to_thread(
                _send_smtp_blocking,
                smtp_host,
                smtp_port,
                smtp_user,
                smtp_password,
                smtp_from,
                to_email,
                subject,
                content,
                is_html
            )
        else:
            logger.error("smtp_credentials_missing_on_server", to=to_email, subject=subject, user_present=bool(smtp_user), pass_present=bool(smtp_password))
            return False

    @classmethod
    async def send_invitation_email(
        cls,
        to_email: str,
        invitee_name: str,
        inviter_name: str,
        invite_link: str,
        db: Optional[AsyncSession] = None
    ) -> bool:
        if db:
            return await cls.send_template_email(
                to_email=to_email,
                trigger_key="team_invitation",
                variables={
                    "invitee_name": invitee_name or "Colleague",
                    "inviter_name": inviter_name,
                    "invite_link": invite_link
                },
                db=db
            )

        subject = f"You've been invited to join {inviter_name}'s workspace on Digital Growth Studio"
        body = f"""Hello {invitee_name or 'Colleague'},

{inviter_name} has invited you to join their workspace on Digital Growth Studio — AI Ads Optimizer.

Click the link below to accept the invitation and set up your account:
{invite_link}

Welcome to the team!
The Digital Growth Studio Team
"""
        return await cls._dispatch_smtp(to_email, subject, body, is_html=False)

    @staticmethod
    async def send_status_update_email(
        to_email: str,
        customer_name: str,
        product_name: str,
        old_status: str,
        new_status: str,
        order_id: str
    ) -> bool:
        status_names = {
            "whatsapp_pending": "WhatsApp Connection Pending",
            "whatsapp_connected": "Connected on WhatsApp",
            "campaign_setup": "Campaign Setup In Progress",
            "campaign_live": "Campaign Live & Active",
            "completed": "Completed",
            "cancelled": "Cancelled",
            "submitted": "Submitted (In Review)"
        }
        old_str = status_names.get(old_status, old_status.replace("_", " ").title())
        new_str = status_names.get(new_status, new_status.replace("_", " ").title())

        subject = f"Status Update: Your Meta Ads Order is now {new_str}"
        body = f"""Hello {customer_name},

The status of your Meta Ads order has been updated.

Order: {product_name}
Order ID: {order_id}
Previous Status: {old_str}
Current Status: {new_str}

Please log into your Digital Growth Studio dashboard to view the latest details:
{getattr(get_settings(), 'FRONTEND_URL', 'https://digitalgrowthstudio.in')}/dashboard/orders

Best regards,
The Digital Growth Studio Team
"""
        return await EmailService._dispatch_smtp(to_email, subject, body, is_html=False)

    @classmethod
    async def send_template_email(
        cls,
        to_email: str,
        trigger_key: str,
        variables: dict,
        db: AsyncSession
    ) -> bool:
        """
        Retrieves the admin-configured email template from DB,
        formats subject/body with variables, and sends via SMTP as HTML.
        """
        from app.models.email_config import EmailTemplateConfig
        from sqlalchemy import select

        # 1. Query DB template
        try:
            stmt = select(EmailTemplateConfig).where(EmailTemplateConfig.trigger_key == trigger_key)
            res = await db.execute(stmt)
            config = res.scalar_one_or_none()
        except Exception as e:
            logger.error("failed_reading_email_template_config", trigger_key=trigger_key, error=str(e))
            config = None

        if config and not config.is_enabled:
            logger.info("email_notification_disabled_by_admin", trigger_key=trigger_key, to=to_email)
            return True

        # 2. Resolve default templates if config is missing
        subject = ""
        body = ""
        if config:
            subject = config.subject_template
            body = config.body_template
        else:
            from app.services.config_seeder import DEFAULT_EMAIL_TEMPLATES
            fallback = DEFAULT_EMAIL_TEMPLATES.get(trigger_key)
            if fallback:
                subject = fallback["subject"]
                body = fallback["body"]
            else:
                logger.error("unknown_email_trigger_key", trigger_key=trigger_key)
                return False

        # 3. Format subject and body dynamically
        try:
            subject = subject.format(**variables)
            body = body.format(**variables)
        except Exception as fmt_err:
            logger.error("failed_formatting_email_template", trigger_key=trigger_key, error=str(fmt_err))
            pass

        # 4. Non-blocking Async SMTP Delivery
        return await cls._dispatch_smtp(to_email, subject, body, is_html=True)
