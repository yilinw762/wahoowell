from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.database import Base, engine, get_db
from app.models import HealthLog
from app.schemas import HealthLogCreate, HealthLogOut


# Base.metadata.create_all(bind=engine)

app = FastAPI(title="WahooWell API")

@app.get("/")
def root():
    return {"ok": True, "message": "WahooWell API is running"}


# ---- retrieve existing entry ----
@app.get("/api/healthlogs", response_model=HealthLogOut | None)
def get_healthlog(user_id: int, log_date: date, db: Session = Depends(get_db)):
    log = (
        db.query(HealthLog)
        .filter(HealthLog.user_id == user_id, HealthLog.log_date == log_date)
        .first()
    )
    return log

# ---- insert or update (upsert) ----
@app.post("/api/healthlogs")
def upsert_healthlog(entry: HealthLogCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(HealthLog)
        .filter(HealthLog.user_id == entry.user_id, HealthLog.log_date == entry.log_date)
        .first()
    )
    if existing:
        for field, value in entry.dict().items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return {"message": "updated", "data": existing.id}
    else:
        new_log = HealthLog(**entry.dict())
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        return {"message": "inserted", "data": new_log.id}
from sqlalchemy import text
from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db, DB_NAME  # or read DB_NAME from env again

@app.get("/db-tables")
def db_tables(db: Session = Depends(get_db)):
    rows = db.execute(text("SHOW TABLES")).all()
    return {"tables": [r[0] for r in rows]}

