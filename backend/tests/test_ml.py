import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, User, Document, ReadingLog
from app.ml.recommender import train_and_recommend

# Setup in-memory sqlite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_recommendation_cold_start(db_session):
    # Setup test user and documents
    user = User(username="testuser", email="test@example.com", hashed_password="pw")
    db_session.add(user)
    
    doc1 = Document(title="Doc 1", filename="file1.txt", file_type="TXT", summary="AI deep learning", category="Technical")
    doc2 = Document(title="Doc 2", filename="file2.txt", file_type="TXT", summary="Financial profit", category="Financial")
    db_session.add_all([doc1, doc2])
    db_session.commit()
    
    # Run recommendation for user with no history
    recommendations = train_and_recommend(user.id, db_session)
    assert len(recommendations) == 2
    # Title matching
    assert recommendations[0].title in ["Doc 1", "Doc 2"]

def test_recommendation_with_history(db_session):
    user = User(username="testuser", email="test@example.com", hashed_password="pw")
    db_session.add(user)
    db_session.commit()
    
    doc1 = Document(title="Deep learning models", filename="file1.txt", file_type="TXT", summary="AI neural networks", category="Technical")
    doc2 = Document(title="Financial Q4 audit", filename="file2.txt", file_type="TXT", summary="Business revenue balance sheet", category="Financial")
    doc3 = Document(title="PyTorch transformer training", filename="file3.txt", file_type="TXT", summary="Deep learning transformers code", category="Technical")
    db_session.add_all([doc1, doc2, doc3])
    db_session.commit()
    
    # Log user reading doc1 (Technical)
    log = ReadingLog(user_id=user.id, document_id=doc1.id, duration_seconds=30)
    db_session.add(log)
    db_session.commit()
    
    # Recommendations should prioritize doc3 over doc2 because user read a Technical document
    recommendations = train_and_recommend(user.id, db_session)
    # The user has read doc1, so it shouldn't be the top recommendation unless padding
    # Let's check that the first recommended item is doc3 (similar category)
    assert recommendations[0].id == doc3.id
