from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app, Counter, Histogram
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

from app.config import settings
from app.database import init_db

# Initialize Prometheus Metrics
REQUEST_COUNT = Counter(
    "api_requests_total", "Total count of requests to the backend", ["method", "endpoint", "status"]
)
REQUEST_LATENCY = Histogram(
    "api_request_duration_seconds", "Request latency in seconds", ["method", "endpoint"]
)
DOCUMENT_CLASSIFICATION_COUNTER = Counter(
    "documents_classified_total", "Total documents classified", ["category"]
)
RAG_QUERY_COUNTER = Counter(
    "rag_queries_total", "Total RAG queries executed"
)

# Initialize Qdrant Client on startup
def init_qdrant():
    try:
        client = QdrantClient(url=settings.QDRANT_URL)
        collection_name = "enterprise_documents"
        # Check if collection exists
        collections = client.get_collections().collections
        exists = any(c.name == collection_name for c in collections)
        if not exists:
            # all-MiniLM-L6-v2 has 384 dimensions
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            print(f"Created Qdrant collection: {collection_name}")
        else:
            print(f"Qdrant collection '{collection_name}' already exists.")
    except Exception as e:
        print(f"Error initializing Qdrant: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    print("Starting up application gateway...")
    init_db()
    init_qdrant()
    yield
    # Shutdown tasks
    print("Shutting down application gateway...")

app = FastAPI(
    title="AI Research & Enterprise Knowledge Assistant API",
    description="Backend API powering document processing, classification, recommendations, RAG and system monitoring.",
    version="1.0.0",
    lifespan=lifespan
)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics ASGI middleware integration
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Request logger middleware for metrics
@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    # Skip metrics and health check paths in Prometheus telemetry
    path = request.url.path
    if path in ["/metrics", "/health"]:
        return await call_next(request)

    start_time = time.time()
    method = request.method
    
    # Process request
    response = await call_next(request)
    
    duration = time.time() - start_time
    status = str(response.status_code)
    
    # Record metrics
    REQUEST_COUNT.labels(method=method, endpoint=path, status=status).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=path).observe(duration)
    
    return response

# Standard health check
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

# Dummy routers to be populated next
from app.api import auth, documents, search, recommendation, monitoring

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(search.router, prefix="/api/search", tags=["RAG & Search"])
app.include_router(recommendation.router, prefix="/api/recommendations", tags=["ML Recommendation"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring & Telemetry"])
