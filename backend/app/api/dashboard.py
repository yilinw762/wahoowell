# app/api/dashboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, timedelta

from app import database, schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{user_id}", response_model=schemas.DashboardSummary)
def get_dashboard_summary(user_id: int, db: Session = Depends(database.get_db)):
    """
    Returns:
      - steps_today
      - calories_today
      - sleep_hours_today
      - weekly_steps (last 7 days, oldest → newest)
      - latest_goal_description
    """

    today = date.today()
    start_date = today - timedelta(days=6)

    # 1) Today's health summary
    today_row = db.execute(
        text(
            """
            SELECT steps, calories_burned, sleep_hours
            FROM HealthLogs
            WHERE user_id = :user_id AND date = :today
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"user_id": user_id, "today": today},
    ).mappings().first()

    steps_today = int(today_row["steps"] or 0) if today_row else 0
    calories_today = (
        int(today_row["calories_burned"] or 0) if today_row and today_row["calories_burned"] is not None else 0
    )
    sleep_hours_today = float(today_row["sleep_hours"]) if today_row and today_row["sleep_hours"] is not None else 0.0

    # 2) Weekly steps
    weekly_rows = db.execute(
        text(
            """
            SELECT date, steps
            FROM HealthLogs
            WHERE user_id = :user_id
              AND date BETWEEN :start_date AND :end_date
            """
        ),
        {"user_id": user_id, "start_date": start_date, "end_date": today},
    ).mappings().all()

    steps_by_date = {
        row["date"]: int(row["steps"] or 0) for row in weekly_rows
    }

    weekly_steps = [
        steps_by_date.get(start_date + timedelta(days=i), 0) for i in range(7)
    ]

    # 3) Latest goal description
    goal_row = db.execute(
        text(
            """
            SELECT metric, target_value, description, start_date, end_date, recurrence
            FROM Goals
            WHERE user_id = :user_id
            ORDER BY
              COALESCE(end_date, start_date, CURRENT_DATE) DESC,
              goal_id DESC
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).mappings().first()

    latest_goal_description = None
    if goal_row:
        parts = []
        if goal_row["description"]:
            parts.append(goal_row["description"])
        else:
            parts.append(f"{goal_row['metric']} target {goal_row['target_value']}")

        if goal_row["recurrence"] and goal_row["recurrence"] != "none":
            parts.append(f"({goal_row['recurrence']})")
        if goal_row["start_date"]:
            parts.append(f"from {goal_row['start_date'].isoformat()}")
        if goal_row["end_date"]:
            parts.append(f"to {goal_row['end_date'].isoformat()}")

        latest_goal_description = " ".join(parts) or None

    return schemas.DashboardSummary(
        steps_today=steps_today,
        calories_today=calories_today,
        sleep_hours_today=sleep_hours_today,
        weekly_steps=weekly_steps,
        latest_goal_description=latest_goal_description,
    )