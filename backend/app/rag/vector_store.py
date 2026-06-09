from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct, Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
from app.config import settings

# Load model locally
# SentenceTransformer automatically caches the model in ~/.cache/torch/sentence_transformers
_model = None

def get_embedding_model():
    global _model
    if _model is None:
        print(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model

def get_qdrant_client():
    return QdrantClient(url=settings.QDRANT_URL)

def upsert_document_chunks(document_id: int, chunks: List[Dict[str, Any]]):
    """Generate embeddings and upsert them to Qdrant."""
    model = get_embedding_model()
    qdrant = get_qdrant_client()
    collection_name = "enterprise_documents"

    # Generate embeddings for all chunks in a batch
    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts).tolist()

    points = []
    for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
        # Point ID must be unique. Let's make a combination of doc_id and chunk_id
        # Qdrant accepts UUID or unsigned integer. Let's use standard integer logic:
        # e.g. doc_id * 100000 + chunk_id
        point_id = int(document_id) * 100000 + int(chunk["chunk_id"])
        
        points.append(PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "document_id": int(document_id),
                "chunk_id": int(chunk["chunk_id"]),
                "text": chunk["text"],
                "char_count": chunk["char_count"]
            }
        ))
        
    qdrant.upsert(
        collection_name=collection_name,
        points=points
    )
    print(f"Successfully indexed {len(points)} chunks for document {document_id} in Qdrant.")

def search_similar_chunks(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search for the most relevant document chunks based on semantic similarity."""
    model = get_embedding_model()
    qdrant = get_qdrant_client()
    collection_name = "enterprise_documents"

    query_vector = model.encode(query).tolist()
    
    results = qdrant.query_points(
        collection_name=collection_name,
        query=query_vector,
        limit=limit
    )

    hits = []
    for hit in results.points:
        hits.append({
            "id": hit.id,
            "score": float(hit.score),
            "payload": hit.payload
        })
        
    return hits

def delete_document_vectors(document_id: int):
    """Delete all chunks belonging to a document from Qdrant."""
    qdrant = get_qdrant_client()
    collection_name = "enterprise_documents"
    
    qdrant.delete(
        collection_name=collection_name,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=int(document_id))
                )
            ]
        )
    )
    print(f"Deleted Qdrant vectors for document {document_id}")
