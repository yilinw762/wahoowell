from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime, func, String # type: ignore
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

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), nullable=True)  # username same as google username
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Follower(Base):
    __tablename__ = "Followers"
    follower_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    follower_user_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    since = Column(DateTime, server_default=func.now())