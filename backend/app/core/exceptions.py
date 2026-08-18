"""
Digital Growth Studio — Custom Exceptions
"""
from fastapi import HTTPException, status


class NotAuthenticatedException(HTTPException):
    def __init__(self, detail: str = "Not authenticated"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(HTTPException):
    def __init__(self, detail: str = "Access forbidden"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class NotFoundException(HTTPException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found",
        )


class MetaConnectionException(HTTPException):
    def __init__(self, detail: str = "Meta connection error"):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        )


class SubscriptionRequiredException(HTTPException):
    def __init__(self, detail: str = "Active subscription required"):
        super().__init__(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=detail,
        )


class SyncInProgressException(HTTPException):
    def __init__(self, detail: str = "Sync already in progress"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )


class SyncCooldownException(HTTPException):
    def __init__(self, minutes_remaining: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {minutes_remaining} minutes before syncing again",
        )


class InsufficientDataException(HTTPException):
    """Raised when there's not enough data for AI recommendations."""
    def __init__(self, detail: str = "Not enough data for this analysis"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
        )
