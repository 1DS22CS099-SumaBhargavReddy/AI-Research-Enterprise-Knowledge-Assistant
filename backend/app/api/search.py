import time
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
import requests

from app.config import settings
from app.database import get_db, ChatHistory, User, Document, ReadingLog
from app.api.auth import get_current_user
from app.rag.vector_store import search_similar_chunks
from app.ml.explainer import explain_similarity, generate_surrogate_lime

router = APIRouter()

# Schema for requests
class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 4

def generate_llm_rag(query: str, chunks: List[dict]) -> str:
    """Generate RAG response using Google Gemini API or fallback to local template."""
    if not chunks:
        return "No relevant documents found. Please upload documents first."

    context_str = "\n\n".join([
        f"[Doc ID: {c['payload']['document_id']}][Chunk ID: {c['payload']['chunk_id']}] Context:\n{c['payload']['text']}"
        for c in chunks
    ])

    prompt = f"""
You are an expert Enterprise Knowledge Assistant. Answer the user's question accurately using ONLY the provided context blocks. 
For every statement you make, cite the corresponding Document ID and Chunk ID in bracket formats, like [Doc 1, Chunk 3]. 
If the context doesn't contain the answer, politely state that the answer is not in the knowledge base.

Context:
{context_str}

Question:
{query}

Answer:
"""

    if settings.GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ]
            }
            res = requests.post(url, json=payload, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            else:
                print(f"Gemini API returned error code {res.status_code}: {res.text}")
        except Exception as e:
            print(f"Failed to query Gemini API: {e}")

    # Local fallback synthesizer (Simulates LLM RAG with exact references)
    time.sleep(1.2)  # Simulate network/LLM latency
    # Find matching chunks and combine summaries
    answer = f"Based on the processed database, here is the synthesized answer:\n\n"
    
    first_chunk = chunks[0]
    doc_id = first_chunk['payload']['document_id']
    chunk_text = first_chunk['payload']['text']
    
    # Extract first sentence or summary
    summary_sentence = chunk_text.split('.')[0] + "."
    answer += f"{summary_sentence} This was retrieved from document [Doc {doc_id}, Chunk {first_chunk['payload']['chunk_id']}] with a semantic confidence match score of {round(first_chunk['score'], 2)}.\n\n"
    
    if len(chunks) > 1:
        sec_chunk = chunks[1]
        sec_sentence = sec_chunk['payload']['text'].split('.')[0] + "."
        answer += f"Additionally, reference data from [Doc {sec_chunk['payload']['document_id']}, Chunk {sec_chunk['payload']['chunk_id']}] notes that: \"{sec_sentence}\""
    else:
        answer += "No additional secondary references were found matching this topic."
        
    return answer

@router.post("/query")
def semantic_query(
    search_req: SearchRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    query = search_req.query
    limit = search_req.limit
    
    start_time = time.time()
    
    # 1. Semantic search
    hits = search_similar_chunks(query, limit=limit)
    
    # 2. Add Explainable AI heatmap to each chunk
    enriched_chunks = []
    for hit in hits:
        chunk_text = hit["payload"]["text"]
        
        # Word highlight weights (simulating LIME token contribution)
        token_highlights = explain_similarity(query, chunk_text)
        
        # Surrogate classification weights if document has a category
        doc_id = hit["payload"]["document_id"]
        doc = db.query(Document).filter(Document.id == doc_id).first()
        category = doc.category if doc else "Unknown"
        lime_weights = generate_surrogate_lime(query, category, chunk_text)
        
        enriched_chunks.append({
            "score": hit["score"],
            "document_id": doc_id,
            "document_title": doc.title if doc else f"Document {doc_id}",
            "chunk_id": hit["payload"]["chunk_id"],
            "text": chunk_text,
            "token_highlights": token_highlights,
            "feature_attributions": lime_weights,
            "category": category
        })
        
        # Log a read event to trigger ML recommendation logs if user is logged in
        if current_user:
            log_entry = ReadingLog(
                user_id=current_user.id,
                document_id=doc_id,
                duration_seconds=5 # Simulating a search hit view duration
            )
            db.add(log_entry)
            
    if current_user:
        db.commit()

    # 3. LLM RAG generation
    rag_response = generate_llm_rag(query, hits)
    
    # 4. Save to chat history
    chat = ChatHistory(
        user_id=current_user.id if current_user else None,
        query=query,
        response=rag_response
    )
    db.add(chat)
    db.commit()
    
    # Compute metadata
    latency = round(time.time() - start_time, 3)
    
    return {
        "query": query,
        "answer": rag_response,
        "retrieved_chunks": enriched_chunks,
        "latency_seconds": latency
    }

@router.get("/history", response_model=List[dict])
def get_chat_history(db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_current_user)):
    user_id = current_user.id if current_user else None
    chats = db.query(ChatHistory).filter(ChatHistory.user_id == user_id).order_by(ChatHistory.timestamp.desc()).limit(20).all()
    return [{
        "id": c.id,
        "query": c.query,
        "response": c.response,
        "timestamp": c.timestamp.isoformat()
    } for c in chats]
