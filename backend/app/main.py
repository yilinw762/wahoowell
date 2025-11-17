# app/main.py
from datetime import date, datetime
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import text

from .database import get_db
from .schemas import HealthLogCreate, HealthLogOut
from .api import community, health, users


app = FastAPI(title="WahooWell API")

# CORS (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include sub-routers
app.include_router(health.router)
app.include_router(users.router)
app.include_router(community.router)


@app.get("/")
def root():
    return {"message": "WahooWell API running"}


# -------- HEALTH LOGS (RAW SQL) --------

@app.post("/api/healthlogs", response_model=HealthLogOut, status_code=201)
def create_healthlog(payload: HealthLogCreate, db: Session = Depends(get_db)):
    """
    Insert a health log row into HealthLogs using raw SQL.
    """
    # Ensure user_id & date exist
    if payload.user_id is None:
        raise HTTPException(status_code=400, detail="user_id is required")

    now = datetime.utcnow()

    result = db.execute(
        text(
            """
            INSERT INTO HealthLogs (
                user_id,
                date,
                steps,
                heart_rate_avg,
                sleep_hours,
                calories_burned,
                exercise_minutes,
                stress_level,
                goal,
                created_at,
                main_exercise
            )
            VALUES (
                :user_id,
                :date,
                :steps,
                :heart_rate_avg,
                :sleep_hours,
                :calories_burned,
                :exercise_minutes,
                :stress_level,
                :goal,
                :created_at,
                :main_exercise
            )
            """
        ),
        {
            "user_id": payload.user_id,
            "date": payload.date,
            "steps": payload.steps or 0,
            "heart_rate_avg": payload.heart_rate_avg,
            "sleep_hours": payload.sleep_hours,
            "calories_burned": payload.calories_burned,
            "exercise_minutes": payload.exercise_minutes or 0,
            "stress_level": payload.stress_level,
            # map notes → goal if your schema uses notes
            "goal": getattr(payload, "notes", None),
            "created_at": now,
            "main_exercise": getattr(payload, "main_exercise", None),
        },
    )
    log_id = result.lastrowid

    row = db.execute(
        text(
            """
            SELECT
                log_id,
                user_id,
                date,
                steps,
                heart_rate_avg,
                sleep_hours,
                calories_burned,
                exercise_minutes,
                stress_level,
                created_at,
                main_exercise
            FROM HealthLogs
            WHERE log_id = :log_id
            """
        ),
        {"log_id": log_id},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=500, detail="Failed to fetch inserted health log")

    return HealthLogOut(**row)


@app.get("/api/healthlogs/all", response_model=List[HealthLogOut])
def list_healthlogs(db: Session = Depends(get_db)):
    """
    Simple test endpoint to list all health logs (raw SQL).
    """
    rows = db.execute(
        text(
            """
            SELECT
                log_id,
                user_id,
                date,
                steps,
                heart_rate_avg,
                sleep_hours,
                calories_burned,
                exercise_minutes,
                stress_level,
                created_at,
                main_exercise
            FROM HealthLogs
            ORDER BY date DESC, log_id DESC
            """
        )
    ).mappings().all()

    return [HealthLogOut(**row) for row in rows]


@app.get("/db-tables")
def db_tables(db: Session = Depends(get_db)):
    """
    Debug endpoint to verify connection to MySQL (no ORM).
    """
    rows = db.execute(text("SHOW TABLES")).all()
    return {"tables": [r[0] for r in rows]}
