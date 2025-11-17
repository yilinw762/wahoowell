from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query # type: ignroe

from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, datetime
from typing import Optional, List

from app.database import get_db
from app.schemas import HealthLogCreate, HealthLogOut
from app.api import community
from .api import health
from .api import users  # users router

app = FastAPI(title="WahooWell API")
app.include_router(health.router)
app.include_router(users.router)
app.include_router(community.router)

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Or specify ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "message": "WahooWell API is running"}

@app.post("/api/healthlogs", response_model=HealthLogOut)
def upsert_healthlog(entry: HealthLogCreate, db: Session = Depends(get_db)):
    """
    Upsert HealthLogs row by (user_id, date) — same behavior as old ORM:
    - If exists, update fields.
    - Else, insert.
    """
    # 1) Check if a log already exists for user/date
    existing = db.execute(
        text(
            """
            SELECT
                log_id, user_id, date, steps, heart_rate_avg, sleep_hours,
                calories_burned, exercise_minutes, stress_level,
                goal, created_at, main_exercise
            FROM HealthLogs
            WHERE user_id = :user_id AND date = :date
            """
        ),
        {"user_id": entry.user_id, "date": entry.date},
    ).mappings().first()

    # Map notes -> goal (per schema vs DB name)
    goal_text = entry.notes

    if existing:
        # 2) UPDATE path
        db.execute(
            text(
                """
                UPDATE HealthLogs
                SET
                    steps = :steps,
                    heart_rate_avg = :heart_rate_avg,
                    sleep_hours = :sleep_hours,
                    calories_burned = :calories_burned,
                    exercise_minutes = :exercise_minutes,
                    stress_level = :stress_level,
                    goal = :goal,
                    main_exercise = :main_exercise
                WHERE log_id = :log_id
                """
            ),
            {
                "log_id": existing["log_id"],
                "steps": entry.steps or 0,
                "heart_rate_avg": entry.heart_rate_avg,
                "sleep_hours": entry.sleep_hours,
                "calories_burned": entry.calories_burned,
                "exercise_minutes": entry.exercise_minutes or 0,
                "stress_level": entry.stress_level,
                "goal": goal_text,
                "main_exercise": getattr(entry, "main_exercise", None),
            },
        )

        row = db.execute(
            text(
                """
                SELECT
                    log_id, user_id, date, steps, heart_rate_avg, sleep_hours,
                    calories_burned, exercise_minutes, stress_level,
                    goal, created_at, main_exercise
                FROM HealthLogs
                WHERE log_id = :log_id
                """
            ),
            {"log_id": existing["log_id"]},
        ).mappings().first()
        # Adapt to HealthLogOut (notes ← goal)
        return HealthLogOut(
            log_id=row["log_id"],
            user_id=row["user_id"],
            date=row["date"],
            steps=row["steps"],
            heart_rate_avg=row["heart_rate_avg"],
            sleep_hours=row["sleep_hours"],
            calories_burned=int(row["calories_burned"]) if row["calories_burned"] is not None else None,
            exercise_minutes=row["exercise_minutes"],
            stress_level=row["stress_level"],
            notes=row["goal"],
            created_at=row["created_at"],
        )

    # 3) INSERT path
    now = datetime.utcnow()
    result = db.execute(
        text(
            """
            INSERT INTO HealthLogs (
                user_id, date, steps, heart_rate_avg, sleep_hours,
                calories_burned, exercise_minutes, stress_level,
                goal, created_at, main_exercise
            )
            VALUES (
                :user_id, :date, :steps, :heart_rate_avg, :sleep_hours,
                :calories_burned, :exercise_minutes, :stress_level,
                :goal, :created_at, :main_exercise
            )
            """
        ),
        {
            "user_id": entry.user_id,
            "date": entry.date,
            "steps": entry.steps or 0,
            "heart_rate_avg": entry.heart_rate_avg,
            "sleep_hours": entry.sleep_hours,
            "calories_burned": entry.calories_burned,
            "exercise_minutes": entry.exercise_minutes or 0,
            "stress_level": entry.stress_level,
            "goal": goal_text,
            "created_at": now,
            "main_exercise": getattr(entry, "main_exercise", None),
        },
    )
    log_id = result.lastrowid

    row = db.execute(
        text(
            """
            SELECT
                log_id, user_id, date, steps, heart_rate_avg, sleep_hours,
                calories_burned, exercise_minutes, stress_level,
                goal, created_at, main_exercise
            FROM HealthLogs
            WHERE log_id = :log_id
            """
        ),
        {"log_id": log_id},
    ).mappings().first()

    return HealthLogOut(
        log_id=row["log_id"],
        user_id=row["user_id"],
        date=row["date"],
        steps=row["steps"],
        heart_rate_avg=row["heart_rate_avg"],
        sleep_hours=row["sleep_hours"],
        calories_burned=int(row["calories_burned"]) if row["calories_burned"] is not None else None,
        exercise_minutes=row["exercise_minutes"],
        stress_level=row["stress_level"],
        notes=row["goal"],
        created_at=row["created_at"],
    )

@app.get("/api/healthlogs/all", response_model=List[HealthLogOut])
def list_healthlogs(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT
                log_id, user_id, date, steps, heart_rate_avg, sleep_hours,
                calories_burned, exercise_minutes, stress_level,
                goal, created_at, main_exercise
            FROM HealthLogs
            ORDER BY date DESC, log_id DESC
            """
        )
    ).mappings().all()

    return [
        HealthLogOut(
            log_id=row["log_id"],
            user_id=row["user_id"],
            date=row["date"],
            steps=row["steps"],
            heart_rate_avg=row["heart_rate_avg"],
            sleep_hours=row["sleep_hours"],
            calories_burned=int(row["calories_burned"]) if row["calories_burned"] is not None else None,
            exercise_minutes=row["exercise_minutes"],
            stress_level=row["stress_level"],
            notes=row["goal"],
            created_at=row["created_at"],
        )
        for row in rows
    ]

@app.get("/db-tables")
def db_tables(db: Session = Depends(get_db)):
    rows = db.execute(text("SHOW TABLES")).all()
    return {"tables": [r[0] for r in rows]}

@app.get("/api/healthlogs", response_model=Optional[HealthLogOut])
def get_healthlog(
    user_id: int = Query(...),
    date: date = Query(...),
    db: Session = Depends(get_db)
):
    row = db.execute(
        text(
            """
            SELECT
                log_id, user_id, date, steps, heart_rate_avg, sleep_hours,
                calories_burned, exercise_minutes, stress_level,
                goal, created_at, main_exercise
            FROM HealthLogs
            WHERE user_id = :user_id AND date = :date
            """
        ),
        {"user_id": user_id, "date": date},
    ).mappings().first()
    if not row:
        return None
    return HealthLogOut(
        log_id=row["log_id"],
        user_id=row["user_id"],
        date=row["date"],
        steps=row["steps"],
        heart_rate_avg=row["heart_rate_avg"],
        sleep_hours=row["sleep_hours"],
        calories_burned=int(row["calories_burned"]) if row["calories_burned"] is not None else None,
        exercise_minutes=row["exercise_minutes"],
        stress_level=row["stress_level"],
        notes=row["goal"],
        created_at=row["created_at"],
    )