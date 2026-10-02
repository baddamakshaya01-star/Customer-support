import sys
import os
import pytest
from unittest.mock import patch, MagicMock

# Mock environment variables before importing
os.environ["OPENAI_API_KEY"] = "sk-dummy-key"
os.environ["DB_PATH"] = "sqlite:///./test_settings.db"
os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"] = "gpt-4o"
# Intentionally don't set secret endpoint/key to verify "Not configured" or set to test "Connected"

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import init_db, SessionLocal, Customer, Ticket, Setting

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()
    db = SessionLocal()
    # Seed 1 customer and 1 ticket
    db.query(Ticket).delete()
    db.query(Customer).delete()
    db.query(Setting).delete()
    c = Customer(
        id="cust-test", name="Test Customer", email="test@example.com",
        plan="Pro", os="Windows 11", product_version="v2.0", device="Desktop",
        frustration_score=3.5
    )
    db.add(c)
    db.add(Ticket(id="tick-test-1", customer_id="cust-test", issue="App crashes", status="Open"))
    db.commit()
    db.close()
    yield
    # Clean up
    db = SessionLocal()
    db.query(Ticket).delete()
    db.query(Customer).delete()
    db.query(Setting).delete()
    db.commit()
    db.close()

def test_get_settings_defaults():
    res = client.get("/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["escalation_frustration_threshold"] == 4.0
    assert data["escalation_repeat_issue_threshold"] == 3
    assert data["auto_handoff_summary"] is True
    assert data["adapt_tone"] is True
    assert data["reference_past_tickets"] is True
    assert data["reply_style"] == "Auto"
    assert data["theme"] == "dark"
    assert "ai_model" in data
    assert data["ai_model"]["provider"] == "Azure OpenAI"
    assert "memory_stats" in data
    assert data["memory_stats"]["customers"] == 1
    assert data["memory_stats"]["tickets"] == 1

def test_put_settings_updates_and_persists():
    res = client.put("/settings", json={
        "escalation_frustration_threshold": 3.0,
        "escalation_repeat_issue_threshold": 2,
        "auto_handoff_summary": False,
        "reply_style": "Always concise",
        "theme": "light"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["escalation_frustration_threshold"] == 3.0
    assert data["escalation_repeat_issue_threshold"] == 2
    assert data["auto_handoff_summary"] is False
    assert data["reply_style"] == "Always concise"
    assert data["theme"] == "light"

    # Verify GET returns updated values
    res_get = client.get("/settings")
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["escalation_frustration_threshold"] == 3.0
    assert get_data["escalation_repeat_issue_threshold"] == 2

def test_escalation_triggers_at_lower_threshold():
    # Customer has frustration 3.5. With threshold 3.0, they should be in escalations
    res = client.get("/escalations")
    assert res.status_code == 200
    escs = res.json()
    assert len(escs) >= 1
    cust = next((e for e in escs if e["customer_id"] == "cust-test"), None)
    assert cust is not None
    assert any("3" in r for r in cust["reasons"])
