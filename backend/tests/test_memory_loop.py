import sys
import os
import pytest
from unittest.mock import patch, MagicMock

# Mock environment variables before importing main to prevent LLMService from crashing
os.environ["OPENAI_API_KEY"] = "sk-dummy-key"
os.environ["DB_PATH"] = "sqlite:///./test_support_agent.db"

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

# We mock llm_service *before* importing main
mock_llm_service = MagicMock()
def mock_get_chat_response(messages, **kwargs):
    content = messages[-1]["content"]
    if "angry" in content.lower():
        return "I apologize for the frustration. I will escalate this immediately."
    return "Here are the steps:\n- Step 1\n- Step 2"

def mock_extract_structured_data(messages, **kwargs):
    content = messages[-1]["content"]
    if "angry" in content.lower():
        return {"new_frustration_score": 4.5, "new_facts": []}
    return {"new_frustration_score": 2.0, "new_facts": [{"fact_type": "preference", "description": "Prefers bullet points"}]}

mock_llm_service.get_chat_response.side_effect = mock_get_chat_response
mock_llm_service.extract_structured_data.side_effect = mock_extract_structured_data

with patch("services.llm_service.llm_service", mock_llm_service):
    from main import app
    from database import SessionLocal, init_db, Customer, Ticket
    import uuid

    client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Setup clean DB for testing
    if os.path.exists("./test_support_agent.db"):
        os.remove("./test_support_agent.db")
    os.environ["DB_PATH"] = "sqlite:///./test_support_agent.db"
    
    init_db()
    db = SessionLocal()
    
    # Create test customer
    c_id = "test-cust-1"
    db.add(Customer(
        id=c_id, name="Test User", email="test@example.com",
        plan="Pro", os="Windows 11", product_version="v1.0", device="Desktop",
        frustration_score=1.0
    ))
    db.commit()
    db.close()
    
    yield
    
    # Teardown
    if os.path.exists("./test_support_agent.db"):
        os.remove("./test_support_agent.db")

def test_memory_loop():
    # 1. Start Chat - Express a preference
    response1 = client.post("/chat", json={
        "customer_id": "test-cust-1",
        "message": "Hi, please always give me short bullet-point answers. How do I reset my password?"
    })
    
    assert response1.status_code == 200
    data1 = response1.json()
    assert "response" in data1
    
    # Verify extraction found the new preference fact
    extracted_data = data1.get("extracted_data", {})
    assert "new_facts" in extracted_data
    
    # Check if fact was actually saved in DB (or memory endpoint)
    response_mem = client.get("/customers/test-cust-1/memory")
    assert response_mem.status_code == 200
    mem_data = response_mem.json()
    facts = mem_data.get("memory_facts", [])
    
    # The LLM should have extracted the preference
    # Since LLMs are non-deterministic, we just check that a fact was saved
    assert len(facts) > 0
    assert any(f["type"] == "preference" for f in facts)
    
    # 2. Second Chat - Check if memory was recalled
    # We won't test the literal response from LLM, but we know the prompt 
    # builder includes memory facts.
    response2 = client.post("/chat", json={
        "customer_id": "test-cust-1",
        "message": "Okay, and how do I change my billing email?"
    })
    
    assert response2.status_code == 200
    data2 = response2.json()
    
    # If the LLM behaves correctly given the prompt, data2["response"] should be bullet points.
    # The main thing is that the loop (save -> read) executed without crashing.
    assert "response" in data2
    
    # 3. Test Frustration update
    response3 = client.post("/chat", json={
        "customer_id": "test-cust-1",
        "message": "I AM SO ANGRY! NOTHING IS WORKING AND I HATE THIS PRODUCT. FIX IT NOW!"
    })
    assert response3.status_code == 200
    
    response_mem3 = client.get("/customers/test-cust-1/memory")
    mem_data3 = response_mem3.json()
    
    # Frustration should have gone up
    assert mem_data3["customer"]["frustration_score"] > 2.0
