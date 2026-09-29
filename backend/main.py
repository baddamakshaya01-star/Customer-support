from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import uvicorn
from dotenv import load_dotenv

load_dotenv()

from database import init_db, get_db
from models import ChatRequest, ChatResponse, MemoryResponse
from services.llm_service import llm_service
from services.memory_service import MemoryService
from services.agent_service import generate_agent_response, extract_memory_from_conversation

app = FastAPI(title="Customer Support Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    customer = MemoryService.get_customer(db, request.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # 1. Save user message
    MemoryService.save_interaction(db, request.customer_id, "user", request.message)

    # 2. Generate Agent Response (incorporates memory and context)
    agent_response_text, escalate, summary = generate_agent_response(
        db, llm_service, request.customer_id, request.message
    )

    # 3. Save Agent Response
    MemoryService.save_interaction(db, request.customer_id, "agent", agent_response_text)

    # 4. Extract Memory Facts (In MVP, run sync; in production, use background task)
    extraction = extract_memory_from_conversation(
        db, llm_service, request.customer_id, request.message, agent_response_text
    )

    return {
        "response": agent_response_text,
        "escalate": escalate,
        "handoff_summary": summary,
        "extracted_data": extraction
    }

@app.get("/customers/{customer_id}/memory", response_model=MemoryResponse)
def get_customer_memory(customer_id: str, db: Session = Depends(get_db)):
    customer = MemoryService.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    tickets = MemoryService.get_tickets(db, customer_id)
    facts = MemoryService.get_memory_facts(db, customer_id)
    
    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "plan": customer.plan,
            "os": customer.os,
            "product_version": customer.product_version,
            "device": customer.device,
            "frustration_score": customer.frustration_score
        },
        "tickets": [{"id": t.id, "issue": t.issue, "status": t.status} for t in tickets],
        "memory_facts": [{"type": f.get("fact_type", "FACT"), "description": f.get("description", "")} for f in facts]
    }

from fastapi.staticfiles import StaticFiles
import os

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
