import sys
import os
import pytest
from unittest.mock import MagicMock, patch

os.environ["OPENAI_API_KEY"] = "sk-dummy-key"
os.environ["DB_PATH"] = "sqlite:///./test_kb.db"

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import init_db, SessionLocal, Customer, Ticket, KBArticle
from services.kb_service import KBService

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_kb_db():
    init_db()
    db = SessionLocal()
    KBService.seed_articles(db, force=True)
    
    # Create sample customer
    db.query(Customer).filter(Customer.id == "cust-kb-test").delete()
    c = Customer(
        id="cust-kb-test", name="KB Tester", email="kb@test.com",
        plan="Pro", os="Windows 11", product_version="v2.4", device="Desktop",
        frustration_score=1.0
    )
    db.add(c)
    db.commit()
    db.close()
    yield
    db = SessionLocal()
    db.query(Customer).filter(Customer.id == "cust-kb-test").delete()
    db.commit()
    db.close()

def test_list_all_kb_articles():
    res = client.get("/kb")
    assert res.status_code == 200
    articles = res.json()
    assert len(articles) == 8
    categories = {a["category"] for a in articles}
    assert "Performance" in categories
    assert "Billing" in categories
    assert "Sync" in categories
    assert "Account" in categories

def test_filter_by_category():
    res = client.get("/kb?category=Billing")
    assert res.status_code == 200
    articles = res.json()
    assert len(articles) == 2
    assert all(a["category"] == "Billing" for a in articles)

def test_search_query():
    res = client.get("/kb?q=freeze")
    assert res.status_code == 200
    articles = res.json()
    assert len(articles) >= 1
    assert any("freeze" in a["title"].lower() or "freeze" in a["summary"].lower() for a in articles)

def test_get_single_kb_article():
    res = client.get("/kb/kb-101")
    assert res.status_code == 200
    art = res.json()
    assert art["id"] == "kb-101"
    assert "App Freeze" in art["title"]
    assert "body" in art
    assert "Resolution" in art["body"]
    assert "updated_at" in art

def test_get_nonexistent_article_returns_404():
    res = client.get("/kb/kb-nonexistent-999")
    assert res.status_code == 404

def test_kb_keyword_matching_and_counter_increment():
    db = SessionLocal()
    art_before = db.query(KBArticle).filter(KBArticle.id == "kb-101").first()
    count_before = art_before.used_count or 0
    db.close()

    mock_llm = MagicMock()
    mock_llm.get_chat_response.return_value = "Try resetting your application cache to fix the freeze."
    mock_llm.extract_structured_data.return_value = {"new_frustration_score": 1.5, "new_facts": []}

    with patch("main.llm_service", mock_llm):
        res = client.post("/chat", json={
            "customer_id": "cust-kb-test",
            "message": "My app keeps crashing and freezing on startup. Can you help?"
        })
        assert res.status_code == 200
        data = res.json()
        assert "suggested_article" in data
        assert data["suggested_article"] is not None
        assert data["suggested_article"]["id"] == "kb-101"
        assert "Suggested Guide:" in data["response"]

    db = SessionLocal()
    art_after = db.query(KBArticle).filter(KBArticle.id == "kb-101").first()
    assert art_after.used_count == count_before + 1
    db.close()
