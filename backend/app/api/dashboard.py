# app/api/dashboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app import models, database, schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/{user_id}", response_model=schemas.DashboardSummary)
def get_dashboard_summary(user_id: int, db: Session = Depends(database.get_db)):
    """
    Returns:
      - steps_today
      - calories_today
      - sleep_hours_today
      - weekly_steps (last 7 days)
      - latest_goal_description (daily goal text, then fallback to Goals)
    """

    today = date.today()
    week_start = today - timedelta(days=6)

    # ---------- Today's metrics ----------
    today_logs = (
        db.query(models.HealthLog)
        .filter(
            models.HealthLog.user_id == user_id,
            models.HealthLog.date == today,
        )
        .all()
    )

    if today_logs:
        steps_today = sum(int(log.steps or 0) for log in today_logs)
        calories_today = float(sum(log.calories_burned or 0 for log in today_logs))

        sleep_values = [
            float(log.sleep_hours)
            for log in today_logs
            if log.sleep_hours is not None
        ]
        sleep_hours_today = (
            sum(sleep_values) / len(sleep_values) if sleep_values else 0.0
        )
    else:
        steps_today = 0
        calories_today = 0.0
        sleep_hours_today = 0.0

    # ---------- Weekly steps (last 7 days) ----------
    week_logs = (
        db.query(models.HealthLog)
        .filter(
            models.HealthLog.user_id == user_id,
            models.HealthLog.date >= week_start,
            models.HealthLog.date <= today,
        )
        .all()
    )

    steps_by_date: dict[date, int] = {}
    for log in week_logs:
        d = log.date
        steps_by_date[d] = steps_by_date.get(d, 0) + int(log.steps or 0)

    weekly_steps: list[int] = []
    for offset in range(7):
        d = week_start + timedelta(days=offset)
        weekly_steps.append(steps_by_date.get(d, 0))

    # ---------- Latest goal description ----------
    latest_goal_description: str | None = None

    # 1) Most recent HealthLog.goal for this user (what you type on Data Entry)
    latest_log_with_goal = (
        db.query(models.HealthLog)
        .filter(
            models.HealthLog.user_id == user_id,
            models.HealthLog.goal.isnot(None),
            models.HealthLog.goal != "",
        )
        .order_by(models.HealthLog.date.desc(), models.HealthLog.created_at.desc())
        .first()
    )

    if latest_log_with_goal and latest_log_with_goal.goal:
        latest_goal_description = latest_log_with_goal.goal
    else:
        # 2) Fallback: latest long-term goal from Goals table
        latest_goal = (
            db.query(models.Goal)
            .filter(models.Goal.user_id == user_id)
            .order_by(models.Goal.start_date.desc())
            .first()
        )

        if latest_goal:
            # Prefer explicit description if present
            if latest_goal.description:
                latest_goal_description = latest_goal.description
            else:
                # Build a compact text like "steps 10000 (weekly) from 2025-10-20 to 2025-10-27"
                parts: list[str] = []
                if latest_goal.metric:
                    parts.append(latest_goal.metric)
                if latest_goal.target_value is not None:
                    val = float(latest_goal.target_value)
                    parts.append(
                        str(int(val)) if val.is_integer() else str(val)
                    )
                if latest_goal.recurrence and latest_goal.recurrence != "none":
                    parts.append(f"({latest_goal.recurrence})")
                if latest_goal.start_date:
                    parts.append(f"from {latest_goal.start_date.isoformat()}")
                if latest_goal.end_date:
                    parts.append(f"to {latest_goal.end_date.isoformat()}")

                latest_goal_description = " ".join(parts) or None

    return schemas.DashboardSummary(
        steps_today=steps_today,
        calories_today=calories_today,
        sleep_hours_today=sleep_hours_today,
        weekly_steps=weekly_steps,
        latest_goal_description=latest_goal_description,
    )
