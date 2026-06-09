import pytest
from app.rag.processor import chunk_text
from app.ml.explainer import explain_similarity

def test_chunk_text():
    text = "Hello world. This is a simple document designed to test our parser split utilities. It contains multiple words."
    chunks = chunk_text(text, chunk_size=20, chunk_overlap=5)
    assert len(chunks) > 0
    assert "Hello" in chunks[0]["text"]

def test_explain_similarity():
    query = "deep learning"
    chunk_text = "We build deep learning networks for sequence tasks."
    explanation = explain_similarity(query, chunk_text)
    
    # "deep" and "learning" should have high weights (0.9)
    deep_tok = next(x for x in explanation if x["token"].lower() == "deep")
    learning_tok = next(x for x in explanation if x["token"].lower() == "learning")
    assert deep_tok["weight"] == 0.9
    assert learning_tok["weight"] == 0.9
    
    # Stopwords or other unrelated words like "for" should be low or 0
    for_tok = next(x for x in explanation if x["token"].lower() == "for")
    assert for_tok["weight"] <= 0.2
