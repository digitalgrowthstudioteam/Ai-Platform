import smtplib
import structlog
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

class EmailService:
    @classmethod
    async def send_invitation_email(cls, to_email: str, invitee_name: str, inviter_name: str, invite_link: str, db: Optional[AsyncSession] = None) -> bool:
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
        body = f"""
Hello {invitee_name or 'Colleague'},

{inviter_name} has invited you to join their workspace on Digital Growth Studio — AI Ads Optimizer.

Click the link below to accept the invitation and set up your account:
{invite_link}

Welcome to the team!
The Digital Growth Studio Team
"""
        
        logger.info("sending_invitation_email_fallback", to=to_email, subject=subject, inviter=inviter_name)
        
        # Check SMTP settings in config
        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        smtp_from = getattr(settings, "SMTP_FROM", "noreply@digitalgrowthstudio.in")

        if smtp_host and smtp_user and smtp_password:
            try:
                msg = MIMEMultipart()
                msg['From'] = smtp_from
                msg['To'] = to_email
                msg['Subject'] = subject
                msg.attach(MIMEText(body, 'plain'))
                
                server = smtplib.SMTP(smtp_host, smtp_port)
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, to_email, msg.as_string())
                server.close()
                logger.info("email_sent_successfully", to=to_email)
                return True
            except Exception as e:
                logger.error("email_smtp_failed", error=str(e), to=to_email)
                return False
        else:
            logger.info("email_smtp_not_configured_logging_body", body=body)
            return True

    @staticmethod
    async def send_status_update_email(
        to_email: str,
        customer_name: str,
        product_name: str,
        old_status: str,
        new_status: str,
        order_id: str
    ) -> bool:
        # Friendly status names mapping
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
{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/dashboard/orders

Best regards,
The Digital Growth Studio Team
"""
        logger.info("sending_status_update_email", to=to_email, subject=subject, order_id=order_id)

        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        smtp_from = getattr(settings, "SMTP_FROM", "noreply@digitalgrowthstudio.in")

        if smtp_host and smtp_user and smtp_password:
            try:
                msg = MIMEMultipart()
                msg['From'] = smtp_from
                msg['To'] = to_email
                msg['Subject'] = subject
                msg.attach(MIMEText(body, 'plain'))

                server = smtplib.SMTP(smtp_host, smtp_port)
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, to_email, msg.as_string())
                server.close()
                logger.info("status_update_email_sent_successfully", to=to_email)
                return True
            except Exception as e:
                logger.error("status_update_email_smtp_failed", error=str(e), to=to_email)
                return False
        else:
            logger.info("status_update_email_smtp_not_configured_logging_body", body=body)
            return True

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
            # Fallbacks matching config_seeder defaults
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

        # 4. Ingress SMTP delivery
        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_password = getattr(settings, "SMTP_PASSWORD", None)
        smtp_from = getattr(settings, "SMTP_FROM", "noreply@digitalgrowthstudio.in")

        logger.info("dispatching_template_email", to=to_email, trigger_key=trigger_key, subject=subject)

        if smtp_host and smtp_user and smtp_password:
            try:
                msg = MIMEMultipart()
                msg['From'] = smtp_from
                msg['To'] = to_email
                msg['Subject'] = subject
                
                # HTML template injection
                msg.attach(MIMEText(body, 'html'))
                
                server = smtplib.SMTP(smtp_host, smtp_port)
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, to_email, msg.as_string())
                server.close()
                logger.info("template_email_sent_successfully", to=to_email, trigger_key=trigger_key)
                return True
            except Exception as e:
                logger.error("template_email_smtp_failed", error=str(e), to=to_email, trigger_key=trigger_key)
                return False
        else:
            logger.info("template_email_smtp_not_configured_logging_body", trigger_key=trigger_key, body=body)
            return True

