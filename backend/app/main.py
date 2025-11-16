from fastapi import FastAPI, Depends, HTTPException #type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from sqlalchemy.orm import Session # type: ignore
from datetime import date
from app.database import Base, engine, get_db
from app.models import HealthLog
from app.schemas import HealthLogCreate, HealthLogOut
from .api import health
from .api import users  # add this import
from .api import followers

from sqlalchemy import text # type: ignor
from typing import Optional

from app.database import Base, engine, get_db
from app.models import HealthLog, Goal, ExerciseType
from app.schemas import (
    HealthLogCreate,
    HealthLogOut,
    DataEntryCreate,
    DataEntryOut,
)
from .api import health
from .api import users
from .api import dashboard  

app = FastAPI(title="WahooWell API")

app.include_router(health.router)
app.include_router(users.router)
app.include_router(dashboard.router) 
app.include_router(followers.router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"ok": True, "message": "WahooWell API is running"}


# --------- Data Entry (HealthLog + Goal + ExerciseType) ---------

@app.get("/api/data-entry", response_model=Optional[DataEntryOut])
def get_data_entry(user_id: int, date: date, db: Session = Depends(get_db)):
    """
    Fetch existing data for given user + date.
    Returns None if there is no data yet.
    """
    log = (
        db.query(HealthLog)
        .filter(HealthLog.user_id == user_id, HealthLog.date == date)
        .first()
    )
    goal = (
        db.query(Goal)
        .filter(Goal.user_id == user_id, Goal.date == date)
        .first()
    )

    if not log and not goal:
        return None

    return DataEntryOut(
        user_id=user_id,
        date=date,
        steps=log.steps if log else None,
        heart_rate_avg=log.heart_rate_avg if log else None,
        sleep_hours=log.sleep_hours if log else None,
        calories_burned=log.calories_burned if log else None,
        exercise_minutes=log.exercise_minutes if log else None,
        main_exercise=log.main_exercise if log else None,
        goal=goal.text if goal else None,
    )


@app.post("/api/data-entry", response_model=DataEntryOut)
def upsert_data_entry(entry: DataEntryCreate, db: Session = Depends(get_db)):
    """
    Upsert health log + goal + exercise type for a user on a given date.
    This assumes user_id comes from auth on the frontend (no user_id field in the form UI).
    """
    # --- HealthLog upsert ---
    log = (
        db.query(HealthLog)
        .filter(HealthLog.user_id == entry.user_id, HealthLog.date == entry.date)
        .first()
    )

    if log:
        log.steps = entry.steps
        log.heart_rate_avg = entry.heart_rate_avg
        log.sleep_hours = entry.sleep_hours
        log.calories_burned = entry.calories_burned
        log.exercise_minutes = entry.exercise_minutes
        log.main_exercise = entry.main_exercise
    else:
        log = HealthLog(
            user_id=entry.user_id,
            date=entry.date,
            steps=entry.steps,
            heart_rate_avg=entry.heart_rate_avg,
            sleep_hours=entry.sleep_hours,
            calories_burned=entry.calories_burned,
            exercise_minutes=entry.exercise_minutes,
            main_exercise=entry.main_exercise,
        )
        db.add(log)

    # --- Goal upsert ---
    if entry.goal is not None and entry.goal.strip() != "":
        goal = (
            db.query(Goal)
            .filter(Goal.user_id == entry.user_id, Goal.date == entry.date)
            .first()
        )
        if goal:
            goal.text = entry.goal
        else:
            goal = Goal(
                user_id=entry.user_id,
                date=entry.date,
                text=entry.goal,
            )
            db.add(goal)

    # --- ExerciseType maintenance ---
    if entry.main_exercise is not None and entry.main_exercise.strip() != "":
        existing_type = (
            db.query(ExerciseType)
            .filter(
                ExerciseType.user_id == entry.user_id,
                ExerciseType.name == entry.main_exercise,
            )
            .first()
        )
        if not existing_type:
            db.add(
                ExerciseType(
                    user_id=entry.user_id,
                    name=entry.main_exercise,
                )
            )

    db.commit()
    db.refresh(log)

    return DataEntryOut(
        user_id=entry.user_id,
        date=entry.date,
        steps=log.steps,
        heart_rate_avg=log.heart_rate_avg,
        sleep_hours=log.sleep_hours,
        calories_burned=log.calories_burned,
        exercise_minutes=log.exercise_minutes,
        main_exercise=log.main_exercise,
        goal=entry.goal,
    )


# --------- Existing HealthLog endpoints (keep for debugging) ---------

@app.get("/api/healthlogs", response_model=Optional[HealthLogOut])
def get_healthlog(user_id: int, date: date, db: Session = Depends(get_db)):
    log = (
        db.query(HealthLog)
        .filter(HealthLog.user_id == user_id, HealthLog.date == date)
        .first()
    )
    return log


@app.post("/api/healthlogs", response_model=HealthLogOut)
def upsert_healthlog(entry: HealthLogCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(HealthLog)
        .filter(HealthLog.user_id == entry.user_id, HealthLog.date == entry.date)
        .first()
    )
    if existing:
        for field, value in entry.dict().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_log = HealthLog(**entry.dict())
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return new_log


@app.get("/api/healthlogs/all", response_model=list[HealthLogOut])
def list_healthlogs(db: Session = Depends(get_db)):
    return db.query(HealthLog).all()


@app.get("/db-tables")
def db_tables(db: Session = Depends(get_db)):
    rows = db.execute(text("SHOW TABLES")).all()
    return {"tables": [r[0] for r in rows]}
