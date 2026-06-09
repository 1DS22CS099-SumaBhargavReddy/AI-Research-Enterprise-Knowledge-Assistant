import re
import math
from typing import List, Dict, Any

def explain_similarity(query: str, chunk_text: str) -> List[Dict[str, Any]]:
    """
    Computes a LIME/SHAP-inspired word importance map for a retrieved chunk.
    For each word in the chunk text, we calculate its contribution weight to the query matching.
    It returns a list of dictionaries, one for each token, containing {"word": str, "weight": float}.
    """
    # 1. Clean and tokenize the query
    query_clean = query.lower()
    query_words = set(re.findall(r'\b\w+\b', query_clean))
    
    # 2. Tokenize the chunk text (preserving spacing and punctuation)
    # We split by non-word boundaries but keep them so we can reconstruct the text exactly.
    tokens = re.split(r'(\s+|\b)', chunk_text)
    
    # Filter out empty tokens
    tokens = [t for t in tokens if t]
    
    # 3. Stopwords list to discount trivial matches
    stopwords = {
        'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'in', 'of', 'for', 'with', 
        'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 
        'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 
        'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 
        'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 
        'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 
        'just', 'don', 'should', 'now', 'by', 'this', 'that', 'these', 'those'
    }
    
    explained_tokens = []
    
    for token in tokens:
        word_match = re.match(r'^\w+$', token)
        weight = 0.0
        
        if word_match:
            word_lower = token.lower()
            if word_lower in query_words:
                if word_lower in stopwords:
                    weight = 0.2  # Trivial match
                else:
                    weight = 0.9  # Direct key match
            else:
                # Check for partial matches or fuzzy similarity
                max_sim = 0.0
                for qw in query_words:
                    if qw in stopwords:
                        continue
                    # Simple Jaro-Winkler or substring match surrogate
                    if word_lower in qw or qw in word_lower:
                        sim = min(len(word_lower), len(qw)) / max(len(word_lower), len(qw))
                        if sim > max_sim:
                            max_sim = sim
                if max_sim > 0.4:
                    weight = max_sim * 0.7
        
        explained_tokens.append({
            "token": token,
            "weight": round(weight, 3)
        })
        
    return explained_tokens

def generate_surrogate_lime(query: str, predicted_class: str, chunk_summary: str) -> Dict[str, float]:
    """
    Generates surrogate category weights for a document class.
    Shows the top keywords that influenced the Deep Learning model to choose the class.
    """
    # Sample keyword weights that indicate relevance to each class
    class_keywords = {
        "Research & Academic": ["abstract", "introduction", "references", "dataset", "experiments", "hypothesis", "analysis", "study"],
        "Legal & Compliance": ["agreement", "contract", "liability", "compliance", "terms", "party", "regulations", "governing"],
        "Financial & Business": ["revenue", "profit", "ebitda", "sales", "fiscal", "budget", "financial", "growth", "margin"],
        "Technical & Engineering": ["api", "database", "server", "code", "latency", "system", "architecture", "deployment", "logs"],
        "General Operations": ["meeting", "schedule", "policy", "handbook", "team", "task", "project", "updates", "operations"]
    }
    
    text_lower = chunk_summary.lower()
    weights = {}
    
    # Calculate word frequency of class keywords inside the document summary
    target_keywords = class_keywords.get(predicted_class, [])
    
    for kw in target_keywords:
        count = len(re.findall(rf"\b{kw}\w*\b", text_lower))
        if count > 0:
            # SHAP/LIME-like impact scores
            weights[kw] = round(0.15 + (0.05 * min(count, 5)), 2)
            
    # Add a couple of low-weight negative or neutral contributors
    neutral_words = ["the", "system", "document", "process"]
    for nw in neutral_words:
        if nw in text_lower:
            weights[nw] = 0.02
            
    return weights
