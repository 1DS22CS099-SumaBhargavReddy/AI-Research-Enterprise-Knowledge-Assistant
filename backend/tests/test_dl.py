import pytest
from app.dl.classifier import classify_document

def test_classify_research():
    text = "Abstract: This research paper details deep learning models on datasets using experimental hypotheses and citations."
    category = classify_document(text)
    assert category == "Research & Academic"

def test_classify_legal():
    text = "This contract and agreement outlines the liability and compliance terms between both parties in this jurisdiction."
    category = classify_document(text)
    assert category == "Legal & Compliance"

def test_classify_financial():
    text = "Fiscal revenue and profits in Q4 increased. Business share growth exceeded the budget forecasts."
    category = classify_document(text)
    assert category == "Financial & Business"

def test_classify_technical():
    text = "We built a backend API using server databases, Docker containers, and Kubernetes to reduce latency."
    category = classify_document(text)
    assert category == "Technical & Engineering"
