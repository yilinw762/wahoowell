from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from datetime import date
from app.database import Base, engine, get_db
from app.models import HealthLog
from app.schemas import HealthLogCreate, HealthLogOut
from sqlalchemy import text

# Base.metadata.create_all(bind=engine)

app = FastAPI(title="WahooWell API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"ok": True, "message": "WahooWell API is running"}

# get a health log by user_id and date
@app.get("/api/healthlogs", response_model=HealthLogOut | None)
def get_healthlog(user_id: int, date: date, db: Session = Depends(get_db)):
    log = (
        db.query(HealthLog)
        .filter(HealthLog.user_id == user_id, HealthLog.date == date)
        .first()
    )
    return log

# upsert a health log
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

# List all health logs for testing
@app.get("/api/healthlogs/all", response_model=list[HealthLogOut])
def list_healthlogs(db: Session = Depends(get_db)):
    return db.query(HealthLog).all()

@app.get("/db-tables")
def db_tables(db: Session = Depends(get_db)):
    rows = db.execute(text("SHOW TABLES")).all()
    return {"tables": [r[0] for r in rows]}