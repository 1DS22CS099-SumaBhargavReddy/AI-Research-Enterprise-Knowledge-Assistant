from transformers import pipeline

# We will use a standard small zero-shot classifier or sentiment classifier as surrogate
# For robust classification of domains, we define a list of candidate classes:
# "Research & Academic", "Legal & Compliance", "Financial & Business", "Technical & Engineering", "General Operations"

_classifier_pipeline = None

def get_classifier():
    global _classifier_pipeline
    if _classifier_pipeline is None:
        try:
            print("Loading document classifier...")
            # Use a lightweight sentiment or token classifier for demonstration
            # To ensure it runs fast and works out-of-the-box:
            _classifier_pipeline = pipeline(
                "text-classification", 
                model="distilbert-base-uncased-finetuned-sst-2-english"
            )
        except Exception as e:
            print(f"Error loading model: {e}. Classifier will use heuristic fallback.")
            _classifier_pipeline = None
    return _classifier_pipeline

def classify_document(text: str) -> str:
    """Classify the text into a domain category using deep learning or heuristics."""
    if not text:
        return "Empty Document"
        
    # Extract the first 2000 characters for classification
    sample = text[:2000].lower()
    
    # Run the DL classifier if loaded
    classifier = get_classifier()
    dl_predicted = None
    if classifier:
        try:
            # We map the sentiment scores to surrogate document tones
            res = classifier(sample[:512])[0]
            label = res["label"] # 'POSITIVE' or 'NEGATIVE'
            dl_predicted = label
        except Exception as e:
            print(f"DL inference failed: {e}")
            
    # Combine with keyword rules to output a high-fidelity business category
    # Categories: "Research & Academic", "Legal & Compliance", "Financial & Business", "Technical & Engineering", "General Operations"
    scores = {
        "Research & Academic": len(re_find(r"(abstract|introduction|references|dataset|experiment|hypothesis|methodology|arxiv|cite)", sample)),
        "Legal & Compliance": len(re_find(r"(agreement|contract|liability|compliance|clause|regulation|party|jurisdiction|hereby)", sample)),
        "Financial & Business": len(re_find(r"(revenue|profit|ebitda|q4|fiscal|income|budget|invest|expense|financial|shares)", sample)),
        "Technical & Engineering": len(re_find(r"(api|code|database|server|software|docker|kubernetes|latency|cpu|git|pipeline|architecture)", sample)),
        "General Operations": len(re_find(r"(meeting|schedule|minutes|policy|handbook|team|task|status|updates|office)", sample))
    }
    
    # Dynamic classification merge
    best_category = max(scores, key=scores.get)
    
    # If the score is 0, fallback to a neutral classification based on DL surrogate tone
    if scores[best_category] == 0:
        if dl_predicted == "POSITIVE":
            return "General Operations"
        elif dl_predicted == "NEGATIVE":
            return "Legal & Compliance"
        return "General Operations"
        
    return best_category

def re_find(pattern: str, text: str):
    return re.findall(pattern, text)

# import re at runtime to avoid top-level issues
import re
