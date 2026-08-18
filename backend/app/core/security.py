"""
Digital Growth Studio — Security Utilities
Encryption, token handling, and security helpers.
"""
import structlog
from cryptography.fernet import Fernet
from typing import Optional

from app.config import get_settings

logger = structlog.get_logger()

_fernet: Optional[Fernet] = None


def get_fernet() -> Fernet:
    """Get or create Fernet encryption instance."""
    global _fernet
    if _fernet is None:
        settings = get_settings()
        if not settings.ENCRYPTION_KEY:
            raise ValueError(
                "ENCRYPTION_KEY is not set. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        _fernet = Fernet(settings.ENCRYPTION_KEY.encode())
    return _fernet


def encrypt_token(token: str) -> str:
    """
    Encrypt a Meta access token for secure database storage.
    Never store tokens in plain text.

    Args:
        token: The plain text access token.

    Returns:
        Encrypted token string.
    """
    f = get_fernet()
    encrypted = f.encrypt(token.encode())
    logger.info("token_encrypted")  # Never log the actual token
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt a stored Meta access token.
    Only used server-side, never sent to frontend.

    Args:
        encrypted_token: The encrypted token from database.

    Returns:
        Decrypted plain text token.
    """
    f = get_fernet()
    decrypted = f.decrypt(encrypted_token.encode())
    logger.info("token_decrypted")  # Never log the actual token
    return decrypted.decode()


def generate_encryption_key() -> str:
    """Generate a new Fernet encryption key."""
    return Fernet.generate_key().decode()
