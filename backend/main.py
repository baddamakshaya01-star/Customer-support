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

from typing import Optional
from services.kb_service import KBService

@app.on_event("startup")
def on_startup():
    init_db()
    db = next(get_db())
    try:
        KBService.seed_articles(db)
        from database import Customer
        if db.query(Customer).count() == 0:
            import seed_data
            seed_data.seed()
    finally:
        db.close()

@app.get("/seed")
@app.post("/seed")
def trigger_seed():
    import seed_data
    seed_data.seed()
    return {"status": "success", "message": "Database seeded with demo customers, tickets, and knowledge base articles!"}

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    customer = MemoryService.get_customer(db, request.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # 1. Save user message
    MemoryService.save_interaction(db, request.customer_id, "user", request.message)

    # 2. Generate Agent Response (incorporates memory, context, and knowledge base)
    agent_response_text, escalate, summary, suggested_article = generate_agent_response(
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
        "extracted_data": extraction,
        "suggested_article": suggested_article
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

# ── Console API Endpoints ──────────────────────────────────────────

from database import Customer, Ticket, Setting
from services.settings_service import SettingsService
from collections import Counter
from datetime import datetime

class SettingsUpdateRequest(BaseModel):
    escalation_frustration_threshold: float | None = None
    escalation_repeat_issue_threshold: int | None = None
    auto_handoff_summary: bool | None = None
    adapt_tone: bool | None = None
    reference_past_tickets: bool | None = None
    reply_style: str | None = None
    theme: str | None = None

@app.get("/settings")
def get_settings_endpoint(db: Session = Depends(get_db)):
    settings = SettingsService.get_all(db)
    ai_model = SettingsService.get_ai_model_status()
    memory_stats = SettingsService.get_memory_stats(db)
    return {
        **settings,
        "ai_model": ai_model,
        "memory_stats": memory_stats
    }

@app.put("/settings")
def update_settings_endpoint(payload: SettingsUpdateRequest, db: Session = Depends(get_db)):
    updates = payload.model_dump(exclude_unset=True) if hasattr(payload, 'model_dump') else payload.dict(exclude_unset=True)
    updated_settings = SettingsService.update_all(db, updates)
    ai_model = SettingsService.get_ai_model_status()
    memory_stats = SettingsService.get_memory_stats(db)
    return {
        **updated_settings,
        "ai_model": ai_model,
        "memory_stats": memory_stats,
        "message": "Settings saved successfully"
    }

@app.get("/kb")
def list_kb_articles(q: Optional[str] = None, category: Optional[str] = None, db: Session = Depends(get_db)):
    return KBService.get_articles(db, q=q, category=category)

@app.get("/kb/{article_id}")
def get_kb_article(article_id: str, db: Session = Depends(get_db)):
    article = KBService.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@app.post("/admin/reseed")
def admin_reseed(db: Session = Depends(get_db)):
    from seed_data import seed
    seed()
    KBService.seed_articles(db, force=True)
    memory_stats = SettingsService.get_memory_stats(db)
    return {
        "ok": True,
        "message": "Demo data reloaded successfully",
        "memory_stats": memory_stats
    }

@app.post("/admin/clear-memory")
def admin_clear_memory(db: Session = Depends(get_db)):
    db.query(Ticket).delete()
    db.query(Customer).delete()
    db.commit()
    return {
        "ok": True,
        "message": "All memory cleared successfully",
        "memory_stats": {
            "customers": 0,
            "tickets": 0,
            "memories_stored": 0
        }
    }


def _fmt_date(dt):
    return dt.strftime("%Y-%m-%d") if dt else None

def categorize_issue(issue: str) -> str:
    lower = (issue or "").lower()
    if any(w in lower for w in ["crash", "freeze", "startup", "hang"]):      return "Crashes / Freezes"
    if any(w in lower for w in ["login", "auth", "password", "access"]):     return "Login / Auth"
    if any(w in lower for w in ["slow", "performance", "lag"]):              return "Performance"
    if any(w in lower for w in ["install", "setup", "update"]):              return "Installation"
    if any(w in lower for w in ["billing", "charge", "payment", "invoice"]): return "Billing"
    if any(w in lower for w in ["export", "pdf", "file", "import"]):         return "File / Export"
    return "Other"

@app.get("/customers")
def list_customers(db: Session = Depends(get_db)):
    customers = db.query(Customer).order_by(Customer.created_at.desc()).all()
    result = []
    for c in customers:
        tickets = db.query(Ticket).filter(Ticket.customer_id == c.id).all()
        last = db.query(Ticket).filter(Ticket.customer_id == c.id)\
                 .order_by(Ticket.created_at.desc()).first()
        result.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "plan": c.plan,
            "ticket_count": len(tickets),
            "frustration_score": round(c.frustration_score or 1.0, 1),
            "last_contact": _fmt_date(last.created_at) if last else (_fmt_date(c.created_at) or "Never"),
            "created_at": _fmt_date(c.created_at),
        })
    return result

@app.get("/tickets")
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    result = []
    for t in tickets:
        customer = db.query(Customer).filter(Customer.id == t.customer_id).first()
        result.append({
            "id": t.id[:8] if len(t.id) > 8 else t.id,
            "full_id": t.id,
            "customer_name": customer.name if customer else "Unknown",
            "customer_id": t.customer_id,
            "issue": t.issue,
            "resolution": t.resolution,
            "status": t.status,
            "date": _fmt_date(t.created_at),
        })
    return result

@app.get("/escalations")
def list_escalations(db: Session = Depends(get_db)):
    settings = SettingsService.get_all(db)
    frust_thresh = settings.get("escalation_frustration_threshold", 4.0)
    repeat_thresh = settings.get("escalation_repeat_issue_threshold", 3)
    auto_summary_enabled = settings.get("auto_handoff_summary", True)

    customers = db.query(Customer).all()
    result = []
    for c in customers:
        tickets = db.query(Ticket).filter(Ticket.customer_id == c.id).all()
        open_tix = [t for t in tickets if t.status in ["Open", "Escalated"]]

        reasons = []
        if (c.frustration_score or 0) >= frust_thresh:
            reasons.append(f"Frustration >= {frust_thresh:g} (Score: {c.frustration_score:.1f}/5.0)")

        # Check same issue repeat_thresh+ times or recurring issues
        issue_counts = Counter(t.issue.strip().lower() for t in tickets if t.issue)
        for iss_text, count in issue_counts.items():
            if count >= repeat_thresh:
                reasons.append(f"Same issue {count} times: '{iss_text.title()}'")
            elif count == 2 and repeat_thresh <= 2:
                reasons.append(f"Recurring issue (2 occurrences): '{iss_text.title()}'")

        if len(open_tix) >= 2 and not any("open" in r.lower() for r in reasons):
            reasons.append(f"{len(open_tix)} open/escalated tickets unresolved")

        if not reasons:
            continue

        if auto_summary_enabled:
            summary_lines = [
                f"Customer: {c.name} ({c.email})",
                f"Plan: {c.plan} | OS: {c.os} | Device: {c.device}",
                f"Frustration Score: {c.frustration_score:.1f}/5.0",
                "Reasons for Escalation:",
                *[f"  - {r}" for r in reasons],
            ]
            if open_tix:
                summary_lines.append("Open Tickets:")
                summary_lines.extend(f"  - [{t.status}] {t.issue}" for t in open_tix[:3])
            summary_text = "\n".join(summary_lines)
        else:
            summary_text = "Automatic handoff summary disabled in settings."

        result.append({
            "customer_id": c.id,
            "customer_name": c.name,
            "customer_email": c.email,
            "plan": c.plan,
            "frustration_score": round(c.frustration_score or 1.0, 1),
            "reasons": reasons,
            "handoff_summary": summary_text,
            "status": "escalated" if any(t.status == "Escalated" for t in tickets) else "pending",
        })

    return sorted(result, key=lambda x: x["frustration_score"], reverse=True)


@app.patch("/escalations/{customer_id}/resolve")
def resolve_escalation(customer_id: str, db: Session = Depends(get_db)):
    customer = MemoryService.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.frustration_score = 1.0
    open_tix = db.query(Ticket).filter(
        Ticket.customer_id == customer_id,
        Ticket.status.in_(["Open", "Escalated"])
    ).all()
    for t in open_tix:
        t.status = "Resolved"
        t.resolution = "Resolved by human agent via escalation queue."
    db.commit()
    return {"ok": True, "message": "Escalation marked as resolved"}

@app.patch("/escalations/{customer_id}/assign")
def assign_escalation(customer_id: str, db: Session = Depends(get_db)):
    customer = MemoryService.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    open_tix = db.query(Ticket).filter(
        Ticket.customer_id == customer_id,
        Ticket.status.in_(["Open", "Escalated"])
    ).all()
    for t in open_tix:
        t.status = "Escalated"
    db.commit()
    return {"ok": True, "message": "Assigned to human agent"}

@app.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    customers = db.query(Customer).all()
    tickets = db.query(Ticket).all()

    total_tickets = len(tickets)
    avg_frustration = sum(c.frustration_score or 1.0 for c in customers) / max(len(customers), 1)

    # Active chats: customers with at least one ticket/interaction
    active_chat_cust_ids = {t.customer_id for t in tickets if t.customer_id}
    active_chats = len(active_chat_cust_ids) if active_chat_cust_ids else len(customers)

    # Pending escalations: matching list_escalations criteria
    esc_data = list_escalations(db)
    pending_escalations = len(esc_data)
    esc_rate = round(pending_escalations / max(len(customers), 1) * 100, 1)

    # Total memories stored across customers (profile attributes, tickets & facts)
    memories_stored = (len(customers) * 4) + len(tickets)

    sorted_customers = sorted(customers, key=lambda c: str(c.created_at or ""))
    frustration_trend = [
        {"label": c.name.split()[0], "score": round(c.frustration_score or 1.0, 1)}
        for c in sorted_customers
    ]

    cat_map = {}
    for t in tickets:
        cat = categorize_issue(t.issue)
        cat_map[cat] = cat_map.get(cat, 0) + 1

    return {
        "total_tickets": total_tickets,
        "active_chats": active_chats,
        "pending_escalations": pending_escalations,
        "avg_frustration": round(avg_frustration, 1),
        "escalation_rate": esc_rate,
        "total_customers": len(customers),
        "memories_stored": memories_stored,
        "frustration_trend": frustration_trend,
        "issue_categories": [
            {"category": k, "count": v}
            for k, v in sorted(cat_map.items(), key=lambda x: -x[1])
        ],
    }

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")

@app.get("/console")
@app.get("/console/{full_path:path}")
def serve_console(full_path: str = ""):
    return FileResponse(os.path.join(frontend_path, "console.html"))

app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
