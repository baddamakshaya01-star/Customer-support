import os
from typing import Dict, Any
from sqlalchemy.orm import Session
from database import Setting, Customer, Ticket

DEFAULT_SETTINGS = {
    "escalation_frustration_threshold": "4",
    "escalation_repeat_issue_threshold": "3",
    "auto_handoff_summary": "true",
    "adapt_tone": "true",
    "reference_past_tickets": "true",
    "reply_style": "Auto",
    "theme": "dark"
}

class SettingsService:
    @staticmethod
    def get_all(db: Session) -> Dict[str, Any]:
        """Fetch all settings merged with defaults and properly typed."""
        rows = db.query(Setting).all()
        data = dict(DEFAULT_SETTINGS)
        for r in rows:
            data[r.key] = r.value

        try:
            frust = float(data.get("escalation_frustration_threshold", 4.0))
        except (ValueError, TypeError):
            frust = 4.0

        try:
            repeat = int(data.get("escalation_repeat_issue_threshold", 3))
        except (ValueError, TypeError):
            repeat = 3

        return {
            "escalation_frustration_threshold": frust,
            "escalation_repeat_issue_threshold": repeat,
            "auto_handoff_summary": str(data.get("auto_handoff_summary", "true")).lower() == "true",
            "adapt_tone": str(data.get("adapt_tone", "true")).lower() == "true",
            "reference_past_tickets": str(data.get("reference_past_tickets", "true")).lower() == "true",
            "reply_style": data.get("reply_style", "Auto"),
            "theme": data.get("theme", "dark"),
        }

    @staticmethod
    def update_all(db: Session, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update settings keys in SQLite and return full settings dict."""
        for k, v in updates.items():
            if k in DEFAULT_SETTINGS:
                if isinstance(v, bool):
                    str_val = "true" if v else "false"
                else:
                    str_val = str(v)

                row = db.query(Setting).filter(Setting.key == k).first()
                if row:
                    row.value = str_val
                else:
                    db.add(Setting(key=k, value=str_val))
        db.commit()
        return SettingsService.get_all(db)

    @staticmethod
    def get_ai_model_status() -> Dict[str, Any]:
        """
        Returns AI model status without exposing API key or endpoint secret.
        Values come from environment variables on the backend only.
        """
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")

        is_connected = bool(
            api_key 
            and endpoint 
            and deployment 
            and api_key.strip() 
            and api_key != "your_azure_key"
        )

        return {
            "provider": "Azure OpenAI",
            "deployment_name": deployment if deployment else "Not configured",
            "status": "Connected" if is_connected else "Not configured",
            "connected": is_connected
        }

    @staticmethod
    def get_memory_stats(db: Session) -> Dict[str, int]:
        """Return memory counters for customers, tickets, and memories stored."""
        cust_count = db.query(Customer).count()
        ticket_count = db.query(Ticket).count()
        # Memories stored across customers (profile attributes, tickets & facts)
        memories_count = (cust_count * 4) + ticket_count
        return {
            "customers": cust_count,
            "tickets": ticket_count,
            "memories_stored": memories_count
        }
