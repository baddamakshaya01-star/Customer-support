from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatRequest(BaseModel):
    customer_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    escalate: bool
    handoff_summary: Optional[str] = None
    extracted_data: Dict[str, Any]

class MemoryFactModel(BaseModel):
    type: str
    description: str

class TicketModel(BaseModel):
    id: str
    issue: str
    status: str

class CustomerModel(BaseModel):
    id: str
    name: str
    email: str
    plan: str
    os: str
    product_version: str
    device: str
    frustration_score: float

class MemoryResponse(BaseModel):
    customer: CustomerModel
    tickets: List[TicketModel]
    memory_facts: List[MemoryFactModel]
