import os
from sqlalchemy.orm import Session
from database import Customer, Ticket
try:
    from hindsight_client import Hindsight
except ImportError:
    Hindsight = None

# Initialize Hindsight Client
hindsight_client = None
if Hindsight:
    # Use Hindsight Cloud
    hindsight_client = Hindsight(
        base_url="https://api.hindsight.vectorize.io", 
        api_key="hsk_e3824552a78ff878c100b73ac0d4050e_e86a0a4080127a0f"
    )

class MemoryService:
    @staticmethod
    def get_customer(db: Session, customer_id: str):
        return db.query(Customer).filter(Customer.id == customer_id).first()

    @staticmethod
    def get_tickets(db: Session, customer_id: str):
        return db.query(Ticket).filter(Ticket.customer_id == customer_id).order_by(Ticket.created_at.desc()).all()

    @staticmethod
    def get_interactions(db: Session, customer_id: str, limit: int = 10):
        # With Hindsight, we don't strictly need to fetch recent N messages 
        # because recall() fetches relevant semantic context.
        # But if we need recent chat history, we'd normally query the Experience network.
        # For simplicity in this hybrid MVP, we will rely on Hindsight's recall for context.
        return []

    @staticmethod
    def get_memory_facts(db: Session, customer_id: str):
        # Query Hindsight Cloud for known facts
        if not hindsight_client:
            return [{"fact_type": "system", "description": "Hindsight API not configured."}]
        
        try:
            # Query the memory bank for the customer
            results = hindsight_client.recall(bank_id=customer_id, query="What are the known facts, preferences, and recurring issues for this user?")
            # Assume results is a string or an object with text.
            # We'll map it to a generic fact type for the UI
            content = str(results)
            if len(content) > 10:
                return [{"fact_type": "hindsight_memory", "description": content}]
            return []
        except Exception as e:
            print("Hindsight recall error:", e)
            return []

    @staticmethod
    def save_interaction(db: Session, customer_id: str, role: str, content: str):
        # We save the interaction to Hindsight's Experience/Observation networks 
        # via the retain() method.
        if hindsight_client:
            try:
                hindsight_client.retain(bank_id=customer_id, content=f"{role.upper()}: {content}")
            except Exception as e:
                print("Hindsight retain error:", e)

    @staticmethod
    def update_frustration(db: Session, customer_id: str, new_score: float):
        # Update structured frustration score in Relational DB
        customer = MemoryService.get_customer(db, customer_id)
        if customer:
            if customer.frustration_score is None:
                customer.frustration_score = new_score
            else:
                customer.frustration_score = (customer.frustration_score * 0.7) + (new_score * 0.3)
            db.commit()

    @staticmethod
    def add_memory_fact(db: Session, customer_id: str, fact_type: str, description: str):
        # With Hindsight, explicit fact extraction is done via retain() internally,
        # but if we have specific structured facts we want to force, we can push them.
        if hindsight_client:
            try:
                hindsight_client.retain(bank_id=customer_id, content=f"Known Fact ({fact_type}): {description}")
            except Exception as e:
                print("Hindsight retain error:", e)
