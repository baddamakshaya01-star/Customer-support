import os
from database import SessionLocal, init_db, Customer, Ticket
import uuid

def seed():
    # Ensure DB is created
    # Remove existing DB for clean seed
    if os.path.exists("./support_agent.db"):
        os.remove("./support_agent.db")
        
    init_db()
    db = SessionLocal()

    # 1. Returning customer with a recurring issue
    c1 = Customer(
        id="cust-101", name="Alice Smith", email="alice@example.com",
        plan="Pro", os="Windows 11", product_version="v2.4", device="Desktop",
        frustration_score=3.0
    )
    db.add(c1)
    db.add(Ticket(id=str(uuid.uuid4()), customer_id=c1.id, issue="App crashes on startup", status="Resolved", resolution="Cleared local cache in AppData"))
    db.add(Ticket(id=str(uuid.uuid4()), customer_id=c1.id, issue="App crashes on startup again", status="Resolved", resolution="Reinstalled application"))

    # 2. Angry customer triggering escalation
    c2 = Customer(
        id="cust-102", name="Bob Jones", email="bob@example.com",
        plan="Enterprise", os="macOS Sonoma", product_version="v2.3", device="Laptop",
        frustration_score=4.5
    )
    db.add(c2)
    db.add(Ticket(id=str(uuid.uuid4()), customer_id=c2.id, issue="Billing overcharge", status="Open"))
    db.add(Ticket(id=str(uuid.uuid4()), customer_id=c2.id, issue="Cannot access premium features", status="Open"))

    # 3. New customer, no history
    c3 = Customer(
        id="cust-103", name="Charlie Brown", email="charlie@example.com",
        plan="Free", os="Ubuntu 22.04", product_version="v2.4", device="Desktop",
        frustration_score=1.0
    )
    db.add(c3)

    # 4. Normal customer
    c4 = Customer(
        id="cust-104", name="Diana Prince", email="diana@example.com",
        plan="Pro", os="iOS 17", product_version="v2.4", device="Mobile",
        frustration_score=1.5
    )
    db.add(c4)
    db.add(Ticket(id=str(uuid.uuid4()), customer_id=c4.id, issue="Forgot password", status="Resolved", resolution="Sent reset link"))

    # 5. Customer with specific environment quirk
    c5 = Customer(
        id="cust-105", name="Eve Adams", email="eve@example.com",
        plan="Free", os="Windows 10", product_version="v2.1", device="Laptop",
        frustration_score=2.0
    )
    db.add(c5)
    db.add(Ticket(id=str(uuid.uuid4()), customer_id=c5.id, issue="Export to PDF fails", status="Resolved", resolution="Disabled hardware acceleration in settings"))

    db.commit()
    db.close()
    print("Database seeded with 5 customers!")

if __name__ == "__main__":
    seed()
