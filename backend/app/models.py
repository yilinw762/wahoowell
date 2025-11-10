from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class HealthLog(Base):
    __tablename__ = "HealthLogs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    log_date = Column(Date, nullable=False)
    weight = Column(Float)
    bmi = Column(Float)
    steps = Column(Integer)
    sleep_hours = Column(Float)
    stress_level = Column(Integer)
    exercise_minutes = Column(Integer)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # important for upsert
        {'mysql_engine': 'InnoDB'},
    )

    # Optional relationship if Users table exists
    # user = relationship("User", back_populates="logs")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    image = Column(String, nullable=True)
    provider = Column(String, nullable=True)
    provider_account_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
