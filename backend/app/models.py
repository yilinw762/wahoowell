from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,          # ← add this
    UniqueConstraint,
    Float,
    func
)
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class HealthLog(Base):
    __tablename__ = "HealthLogs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    steps = Column(Integer)
    heart_rate_avg = Column(Integer)
    sleep_hours = Column(Float)
    calories_burned = Column(Integer)
    exercise_minutes = Column(Integer)
    stress_level = Column(Integer)
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    __table_args__ = (
        # important for upsert
        {'mysql_engine': 'InnoDB'},
    )

    # Optional relationship if Users table exists
    # user = relationship("User", back_populates="logs")

class User(Base):
    __tablename__ = "Users"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), nullable=True)  # username same as google username
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    posts = relationship(
        "CommunityPost",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    comments = relationship(
        "PostComment",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reactions = relationship(
        "PostReaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

class CommunityPost(Base):
    __tablename__ = "CommunityPosts"

    post_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    content = Column(Text, nullable=False)
    visibility = Column(Enum("public", "followers", "private", name="post_visibility"), default="public")

    user = relationship("User", back_populates="posts")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    reactions = relationship("PostReaction", back_populates="post", cascade="all, delete-orphan")


class PostComment(Base):
    __tablename__ = "PostComments"

    comment_id = Column(BigInteger, primary_key=True, autoincrement=True)
    post_id = Column(BigInteger, ForeignKey("CommunityPosts.post_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("Users.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    content = Column(Text, nullable=False)

    post = relationship("CommunityPost", back_populates="comments")
    user = relationship("User", back_populates="comments")


class PostReaction(Base):
    __tablename__ = "PostReactions"

    reaction_id = Column(BigInteger, primary_key=True, autoincrement=True)
    post_id = Column(BigInteger, ForeignKey("CommunityPosts.post_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("Users.user_id", ondelete="CASCADE"), nullable=False)
    reaction_type = Column(String(32), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", "reaction_type", name="ux_user_post_reaction"),
    )

    post = relationship("CommunityPost", back_populates="reactions")
    user = relationship("User", back_populates="reactions")