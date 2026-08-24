import smtplib
import structlog
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

class EmailService:
    @staticmethod
    async def send_invitation_email(to_email: str, invitee_name: str, inviter_name: str, invite_link: str) -> bool:
        subject = f"You've been invited to join {inviter_name}'s workspace on Digital Growth Studio"
        body = f"""
Hello {invitee_name or 'Colleague'},

{inviter_name} has invited you to join their workspace on Digital Growth Studio — AI Ads Optimizer.

Click the link below to accept the invitation and set up your account:
{invite_link}

Welcome to the team!
The Digital Growth Studio Team
"""
        
        logger.info("sending_invitation_email", to=to_email, subject=subject, inviter=inviter_name)
        
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

