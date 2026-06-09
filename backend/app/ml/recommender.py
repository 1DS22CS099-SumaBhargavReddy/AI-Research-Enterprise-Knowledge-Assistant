import numpy as np
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.database import Document, ReadingLog

def train_and_recommend(user_id: int, db: Session, limit: int = 5):
    """
    Train a simple content-based recommendation model.
    It builds vectors from document titles and summaries, 
    averages the vectors of documents the user has read (weighted by duration),
    and recommends the most similar documents the user hasn't read yet.
    """
    # 1. Fetch all documents
    all_docs = db.query(Document).all()
    if len(all_docs) <= 1:
        # Not enough documents to recommend
        return all_docs

    # 2. Fetch user's reading logs
    user_logs = db.query(ReadingLog).filter(ReadingLog.user_id == user_id).all()
    
    # Cold start: user hasn't read anything yet
    if not user_logs:
        # Recommend recently created documents
        return db.query(Document).order_by(Document.created_at.desc()).limit(limit).all()

    # 3. Build corpus
    # If summary is missing, fallback to title
    corpus = [f"{doc.title} {doc.summary or ''}" for doc in all_docs]
    doc_ids = [doc.id for doc in all_docs]
    doc_map = {doc.id: doc for doc in all_docs}
    
    # 4. Compute TF-IDF
    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
    except Exception as e:
        print(f"Error fitting TF-IDF: {e}")
        # Return fallback (most recent documents)
        return db.query(Document).order_by(Document.created_at.desc()).limit(limit).all()
        
    # 5. Build user profile vector
    # Profile is a weighted average of vectors of read documents
    user_profile = np.zeros((1, tfidf_matrix.shape[1]))
    read_doc_ids = set()
    total_duration = 0
    
    for log in user_logs:
        if log.document_id in doc_ids:
            doc_idx = doc_ids.index(log.document_id)
            read_doc_ids.add(log.document_id)
            # Duration weight, minimum weight of 1
            weight = max(1.0, float(log.duration_seconds))
            user_profile += tfidf_matrix[doc_idx].toarray() * weight
            total_duration += weight
            
    if total_duration > 0:
        user_profile = user_profile / total_duration
    else:
        # Fallback if logs exist but duration is 0
        user_profile = tfidf_matrix[0].toarray()

    # 6. Compute similarities
    similarities = cosine_similarity(user_profile, tfidf_matrix).flatten()
    
    # 7. Sort and filter
    # Find documents the user has NOT read yet
    recommended_indices = np.argsort(similarities)[::-1]
    
    recommendations = []
    for idx in recommended_indices:
        doc_id = doc_ids[idx]
        if doc_id not in read_doc_ids:
            recommendations.append(doc_map[doc_id])
            if len(recommendations) >= limit:
                break
                
    # If there are not enough unread documents, pad with similar read ones or recent ones
    if len(recommendations) < limit:
        for idx in recommended_indices:
            doc_id = doc_ids[idx]
            if doc_id not in [r.id for r in recommendations]:
                recommendations.append(doc_map[doc_id])
                if len(recommendations) >= limit:
                    break
                    
    return recommendations
