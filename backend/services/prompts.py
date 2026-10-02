from config import config

def build_system_prompt(customer, tickets, memory_facts, interactions, settings: dict = None) -> str:
    if settings is None:
        settings = {
            "adapt_tone": True,
            "reference_past_tickets": True,
            "reply_style": "Auto",
            "escalation_frustration_threshold": 4.0
        }

    adapt_tone = settings.get("adapt_tone", True)
    ref_past = settings.get("reference_past_tickets", True)
    reply_style = settings.get("reply_style", "Auto")
    frustration_thresh = float(settings.get("escalation_frustration_threshold", 4.0))

    prompt = f"""You are an expert AI Customer Support Agent for a software company.
Your goal is to be helpful, efficient, and deeply empathetic. 

CUSTOMER CONTEXT:
Name: {customer.name}
Plan: {customer.plan}
Environment: OS: {customer.os}, Version: {customer.product_version}, Device: {customer.device}
Current Frustration Level (1-5): {customer.frustration_score:.1f}
"""

    if adapt_tone:
        if customer.frustration_score >= frustration_thresh:
            prompt += "\n**IMPORTANT: The customer is frustrated. Be extremely empathetic, concise, and apologize for the inconvenience. Do not ask them to repeat information they have already provided.**\n"
        else:
            prompt += "\n**The customer is currently calm. Be friendly, concise, and efficient.**\n"
    else:
        prompt += "\n**Maintain a steady, professional, and standard support tone at all times.**\n"

    # Style directives based on reply_style
    if reply_style == "Always empathetic":
        prompt += "\nREPLY STYLE DIRECTIVE: Always maintain a deeply empathetic, reassuring, warm, and supportive tone across all answers, acknowledging any difficulties.\n"
    elif reply_style == "Always concise":
        prompt += "\nREPLY STYLE DIRECTIVE: Always provide ultra-concise, direct, bullet-pointed, and actionable answers without conversational filler.\n"
    else: # "Auto"
        prompt += "\nREPLY STYLE DIRECTIVE: Dynamically balance empathy and brevity based on user urgency and context.\n"

    if ref_past and tickets:
        prompt += "\nPAST TICKETS:\n"
        for t in tickets[:3]:
            prompt += f"- [{t.status}] Issue: {t.issue} (Resolution: {t.resolution or 'None'})\n"
    elif not ref_past:
        prompt += "\n(NOTE: Do not mention or reference past tickets in your reply.)\n"

    if memory_facts:
        prompt += "\nKNOWN FACTS & PREFERENCES (DO NOT SUGGEST FAILED SOLUTIONS):\n"
        for f in memory_facts:
            prompt += f"- [{f.get('fact_type', 'FACT').upper()}] {f.get('description', '')}\n"

    prompt += """
INSTRUCTIONS:
1. Always use the customer's context to personalize the response.
2. NEVER ask for information you already have (like OS, plan, past issues).
3. If they mention a recurring issue, acknowledge it ("I see you've had this caching issue before").
4. If they need human help, tell them you can escalate.
"""
    return prompt

MEMORY_EXTRACTION_PROMPT = """Analyze this single exchange between a user and an agent. 
Evaluate the customer's sentiment and extract any NEW facts to remember.
Pay special attention to whether a solution worked or failed, or if they expressed a new preference.

Output ONLY a JSON object with the following schema:
{
    "new_frustration_score": float (1.0 to 5.0, where 1 is happy/calm and 5 is extremely angry),
    "new_facts": [
        {
            "fact_type": "worked_solution" | "failed_solution" | "recurring_issue" | "preference",
            "description": "string describing the fact concisely"
        }
    ]
}
If no new facts were discussed, leave the `new_facts` array empty. You MUST always output `new_frustration_score` based on the user's latest tone.
"""
