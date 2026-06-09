# AI-Research-Enterprise-Knowledge-Assistant

This project implements a production-grade, highly-aesthetic full-stack enterprise knowledge discovery platform. It combines a FastAPI backend, a React frontend, Qdrant vector search, PostgreSQL metadata storage, local Machine Learning (recommendations) and Deep Learning (classification), Explainable AI (LIME/SHAP-like word importance heatmap), and MLOps/monitoring configurations using Prometheus and Grafana.
<img width="1771" height="860" alt="image" src="https://github.com/user-attachments/assets/ba90b04e-31c4-48de-a9af-3c86fc6bb090" />

## Proposed Architecture

```text
                                 ┌──────────────┐
                                 │ React Client │
                                 └──────┬───────┘
                                        │
                               WebSocket / REST HTTP
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │ FastAPI Application Gateway │
                         └──────────────┬──────────────┘
                                        │
             ┌──────────────────────────┼─────────────────────────┐
             ▼                          ▼                         ▼
      ┌──────────────┐           ┌──────────────┐          ┌─────────────┐
      │  PostgreSQL  │           │    Qdrant    │          │ Redis Cache │
      │  (Metadata)  │           │ (Vector DB)  │          │  & Message  │
      └──────────────┘           └──────────────┘          └─────────────┘
             ▲                          ▲
             │                          │
             │                   Sentence Embeddings
             │                          │
   ┌─────────┴──────────────────────────┴─────────────────────────────────┐
   │                       RAG & Analytics Engine                         │
   │                                                                      │
   │  - Deep Learning: HF Transformer Document Classifier                 │
   │  - Machine Learning: Scikit-learn Document Recommendation Engine     │
   │  - Explainable AI: Token-level cosine similarity contribution maps   │
   │  - Generation: Mock/Local LLM or External LLM API (Gemini/OpenAI)    │
   └──────────────────────────────────────────────────────────────────────┘
```

## Features

### Backend (FastAPI + ML/DL/RAG)
* **Processor**: Text processing, layout chunking, and metadata extraction.
* **Vector Store**: Integrates Qdrant database, manages the vector index, stores chunk embeddings, and performs hybrid semantic search.
* **Recommender**: Uses scikit-learn to build a collaborative/content-based recommendation model based on reading logs.
* **Classifier**: Uses a HuggingFace DistilBERT classifier to perform automated classification of document types.
* **Explainer**: Implements an explainability engine. It computes word-level and token-level cosine similarity contribution maps relative to the user query.

### Frontend (React)
* **Dashboard**: Main portal showcasing statistics (documents processed, tokens embedded, user sessions), system health charts, and quick actions.
* **Chat Interface**: An interactive chat interface with typing indicators, inline document citation indicators, and a togglable "Explainable AI Panel".
* **Document Upload**: A drag-and-drop file upload zone displaying real-time processing queues, classified categories, and extraction stats.
* **Recommendation Widget**: Displays a curated feed of recommended research papers/documents tailored to the user's reading activity.
* **Monitoring Dashboard**: Visualizes real-time metrics, simulating a Grafana dashboard directly in the app.

## Commands

Here are all the commands referenced in the implementation plan and required to run the project:

### 1. Start Orchestration & Infrastructure
To launch PostgreSQL, Qdrant, Redis, Prometheus, and Grafana:
```bash
docker compose up -d
```

### 2. Run the Backend Server
*Note: Make sure your virtual environment is activated and dependencies are installed from `backend/requirements.txt`.*
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Run the Frontend Development Server
*Note: Make sure dependencies are installed via `npm install` in the frontend directory.*
```bash
cd frontend
npm run dev
```
*(Or use Vite directly if node_modules are present: `node node_modules/vite/bin/vite.js --host`)*

### 4. Run Automated Tests
```bash
cd backend
python -m pytest tests/test_rag.py
python -m pytest tests/test_ml.py
python -m pytest tests/test_dl.py
```
