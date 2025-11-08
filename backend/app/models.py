from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base

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
