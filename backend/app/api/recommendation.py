from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db, ReadingLog, User, Document
from app.api.auth import get_current_user
from app.ml.recommender import train_and_recommend

router = APIRouter()

# Schema for reading logs
class ReadingLogCreate(BaseModel):
    document_id: int
    duration_seconds: int

@router.get("/")
def get_recommendations(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Get recommended documents for the logged in user.
    If not logged in, returns the fallback most recent documents.
    """
    user_id = current_user.id if current_user else 1 # Default surrogate user for sandbox ease
    
    recommended_docs = train_and_recommend(user_id=user_id, db=db, limit=limit)
    
    return [{
        "id": doc.id,
        "title": doc.title,
        "file_type": doc.file_type,
        "category": doc.category,
        "summary": doc.summary,
        "created_at": doc.created_at.isoformat()
    } for doc in recommended_docs]

@router.post("/log-reading")
def log_reading_activity(
    log_data: ReadingLogCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Logs user interaction with a document to feed the ML recommendation system.
    """
    user_id = current_user.id if current_user else 1 # default mock user if unauthenticated
    
    # Verify document exists
    doc = db.query(Document).filter(Document.id == log_data.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    log_entry = ReadingLog(
        user_id=user_id,
        document_id=log_data.document_id,
        duration_seconds=log_data.duration_seconds
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    
    return {
        "status": "success",
        "message": f"Logged {log_data.duration_seconds}s viewing time for doc {log_data.document_id}."
    }
