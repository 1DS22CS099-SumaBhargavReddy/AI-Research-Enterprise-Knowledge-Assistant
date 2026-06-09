import os
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db, Document, User
from app.api.auth import get_current_user
from app.rag.processor import extract_text_from_file, chunk_text
from app.rag.vector_store import upsert_document_chunks, delete_document_vectors
from app.dl.classifier import classify_document

router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper to generate a text summary
def generate_summary(text: str, max_sentences: int = 4) -> str:
    """Generate a clean summary using sentence scoring."""
    if not text:
        return ""
    # Split sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    if not sentences:
        return text[:200]
        
    # Standard TF-IDF summary simulation: score based on keyword match
    # Or just return the first few sentences
    return " ".join(sentences[:max_sentences])

# Import regex for sentence split
import re

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    start_time = time.time()
    
    # Check extension
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".txt", ".md", ".pdf"]:
        raise HTTPException(status_code=400, detail="Only .txt, .md, and .pdf files are supported.")
        
    # Save file
    file_path = os.path.join(UPLOAD_DIR, f"{int(time.time())}_{filename}")
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    try:
        # 1. Extract raw text
        raw_text = extract_text_from_file(file_path)
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Document appears to be empty.")
            
        # 2. Deep Learning Classification
        category = classify_document(raw_text)
        
        # 3. Create Summary
        summary = generate_summary(raw_text)
        
        # 4. Save to Database
        db_doc = Document(
            title=filename,
            filename=os.path.basename(file_path),
            file_type=ext.replace(".", "").upper(),
            category=category,
            summary=summary,
            doc_metadata={
                "size_bytes": len(content),
                "upload_duration_seconds": round(time.time() - start_time, 2),
                "char_count": len(raw_text)
            },
            owner_id=current_user.id if current_user else None
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        # 5. Chunk and Vector Indexing
        chunks = chunk_text(raw_text)
        if chunks:
            upsert_document_chunks(db_doc.id, chunks)
            
        return {
            "id": db_doc.id,
            "title": db_doc.title,
            "category": db_doc.category,
            "summary": db_doc.summary,
            "chunks_indexed": len(chunks),
            "size_bytes": len(content)
        }
    except Exception as e:
        # Cleanup file if processing failed
        if os.path.exists(file_path):
            os.remove(file_path)
        print(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.get("/", response_model=List[dict])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [{
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "category": doc.category,
        "summary": doc.summary,
        "metadata": doc.doc_metadata,
        "created_at": doc.created_at.isoformat()
    } for doc in docs]

@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check ownership if authentication is active
    if current_user and doc.owner_id and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this document.")
        
    try:
        # Delete from Qdrant vector database
        delete_document_vectors(doc_id)
        
        # Delete raw file from local storage
        file_path = os.path.join(UPLOAD_DIR, doc.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            
        # Delete from Postgres metadata database
        db.delete(doc)
        db.commit()
        return {"status": "success", "message": f"Deleted document {doc_id} successfully."}
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document from database.")
