import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class TeamMember(BaseModel):
    """
    TeamMember model.
    Enables users to invite colleagues to their ad workspaces under plan seat caps.
    """
    __tablename__ = "team_members"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=True,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="member",  # admin, member, viewer
    )
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",  # active, pending
    )
    allowed_tabs: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
        default="/dashboard,/briefs/daily,/briefs/weekly,/campaigns,/ad-sets,/ads",
    )
    allowed_ad_accounts: Mapped[str] = mapped_column(
        String(1000),
        nullable=True,
        default="",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="team_members",
    )
