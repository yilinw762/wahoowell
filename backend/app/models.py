from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime, func, String  # type: ignore
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
    goal = Column(String(255))          # ⬅️ renamed from notes
    created_at = Column(DateTime, server_default=func.now())
    main_exercise = Column(String(255))

    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )


class User(Base):
    __tablename__ = "Users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class Goal(Base):
    __tablename__ = "Goals"

    goal_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    metric = Column(String(50), nullable=False)
    target_value = Column(Float)
    description = Column(String(255))   # ⬅️ human-readable text
    start_date = Column(Date)
    end_date = Column(Date)
    recurrence = Column(String(20))     # maps enum('none','daily','weekly','monthly')



class ExerciseType(Base):
    __tablename__ = "ExerciseTypes"

    exercise_type_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
