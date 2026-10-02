import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config

from collections import Counter

def check_escalation(customer, tickets, memory_facts, settings: dict = None):
    """
    Evaluates if the conversation should be escalated to a human.
    Uses dynamic thresholds and options from settings table if provided.
    Returns (should_escalate: bool, summary: str | None)
    """
    if settings:
        frustration_thresh = float(settings.get("escalation_frustration_threshold", 4.0))
        recurrence_thresh = int(settings.get("escalation_repeat_issue_threshold", 3))
        auto_summary = settings.get("auto_handoff_summary", True)
    else:
        frustration_thresh = config.ESCALATION_FRUSTRATION_THRESHOLD
        recurrence_thresh = config.ESCALATION_RECURRENCE_THRESHOLD
        auto_summary = True

    escalate = False
    reasons = []

    # Rule 1: High Frustration
    cust_score = customer.frustration_score if customer.frustration_score is not None else 1.0
    if cust_score >= frustration_thresh:
        escalate = True
        reasons.append(f"High customer frustration (Score: {cust_score:.1f}/5.0 >= threshold {frustration_thresh:g}).")

    # Rule 2: Recurring issues (from memory facts or past tickets)
    recurring_count = sum(1 for f in memory_facts if f.get('fact_type') == 'recurring_issue')
    issue_counts = Counter(t.issue.strip().lower() for t in tickets if t.issue)
    max_ticket_repeat = max(issue_counts.values()) if issue_counts else 0

    if recurring_count >= recurrence_thresh:
        escalate = True
        reasons.append(f"Customer has {recurring_count} recurring issue memories (threshold: {recurrence_thresh}).")
    elif max_ticket_repeat >= recurrence_thresh:
        escalate = True
        reasons.append(f"Customer has experienced the same issue {max_ticket_repeat} times (threshold: {recurrence_thresh}).")

    # Rule 3: Many open/escalated tickets recently
    open_tickets = [t for t in tickets if t.status in ['Open', 'Escalated']]
    if len(open_tickets) >= 2:
        escalate = True
        reasons.append(f"Customer already has {len(open_tickets)} open/escalated tickets.")

    if not escalate:
        return False, None

    if not auto_summary:
        return True, None

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

