import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config

def check_escalation(customer, tickets, memory_facts):
    """
    Evaluates if the conversation should be escalated to a human.
    Returns (should_escalate: bool, summary: str | None)
    """
    escalate = False
    reasons = []

    # Rule 1: High Frustration
    if customer.frustration_score >= config.ESCALATION_FRUSTRATION_THRESHOLD:
        escalate = True
        reasons.append(f"High customer frustration (Score: {customer.frustration_score:.1f}/5.0).")

    # Rule 2: Recurring issues
    # Count how many times "recurring_issue" is in memory facts
    recurring_count = sum(1 for f in memory_facts if f.get('fact_type') == 'recurring_issue')
    if recurring_count >= config.ESCALATION_RECURRENCE_THRESHOLD:
        escalate = True
        reasons.append("Customer has experienced multiple recurring issues.")

    # Rule 3: Many open/escalated tickets recently
    open_tickets = [t for t in tickets if t.status in ['Open', 'Escalated']]
    if len(open_tickets) >= 2:
        escalate = True
        reasons.append(f"Customer already has {len(open_tickets)} open/escalated tickets.")

    if not escalate:
        return False, None

    summary = "HANDOFF SUMMARY:\n"
    summary += f"- Customer: {customer.name} ({customer.email})\n"
    summary += f"- Environment: {customer.os}, {customer.product_version}\n"
    summary += "- Escalation Reasons:\n"
    for r in reasons:
        summary += f"  * {r}\n"
    summary += "- Important Facts:\n"
    for f in memory_facts[-3:]: # last 3 facts
        summary += f"  * [{f.get('fact_type', 'FACT')}] {f.get('description', '')}\n"

    return True, summary
