from sqlalchemy.orm import Session
from .memory_service import MemoryService
from .escalation_service import check_escalation
from .prompts import build_system_prompt, MEMORY_EXTRACTION_PROMPT

from .settings_service import SettingsService
from .kb_service import KBService

def generate_agent_response(db: Session, llm, customer_id: str, user_message: str):
    customer = MemoryService.get_customer(db, customer_id)
    if not customer:
        return "Customer not found.", False, None, None

    settings = SettingsService.get_all(db)
    tickets = MemoryService.get_tickets(db, customer_id)
    memory_facts = MemoryService.get_memory_facts(db, customer_id)
    recent_interactions = MemoryService.get_interactions(db, customer_id, limit=5)

    system_prompt = build_system_prompt(customer, tickets, memory_facts, recent_interactions, settings=settings)
    
    messages = [{"role": "system", "content": system_prompt}]
    for interaction in recent_interactions:
        messages.append({"role": interaction.role, "content": interaction.content})
        
    messages.append({"role": "user", "content": user_message})

    # Get LLM response
    response = llm.get_chat_response(messages)
    
    # Check for escalation with dynamic settings
    escalate, summary = check_escalation(customer, tickets, memory_facts, settings=settings)

    # Check for relevant knowledge base article match
    combined_query = f"{user_message} " + " ".join(t.issue or "" for t in tickets if t.status in ["Open", "Escalated"])
    suggested_article = KBService.match_article(db, combined_query)
    if suggested_article:
        link_markdown = f"\n\n📖 **Suggested Guide:** [{suggested_article['title']}](/console/knowledge?id={suggested_article['id']})"
        if suggested_article["title"].lower() not in response.lower():
            response += link_markdown

    return response, escalate, summary, suggested_article


def extract_memory_from_conversation(db: Session, llm, customer_id: str, user_message: str, agent_response: str):
    messages = [
        {"role": "system", "content": MEMORY_EXTRACTION_PROMPT},
        {"role": "user", "content": f"User: {user_message}\n\nAgent: {agent_response}"}
    ]
    
    extraction = llm.extract_structured_data(messages, response_format={"type": "json_object"})
    
    if "new_frustration_score" in extraction:
        MemoryService.update_frustration(db, customer_id, extraction["new_frustration_score"])
        
    for fact in extraction.get("new_facts", []):
        # Prevent duplicates ideally, but for MVP just append
        MemoryService.add_memory_fact(db, customer_id, fact["fact_type"], fact["description"])
        
    return extraction
