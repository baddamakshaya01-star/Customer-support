import os
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
import json

Base = declarative_base()

class Customer(Base):
    __tablename__ = 'customers'
    id = Column(String, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
    plan = Column(String)
    os = Column(String)
    product_version = Column(String)
    device = Column(String)
    frustration_score = Column(Float, default=1.0) # 1 to 5
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tickets = relationship("Ticket", back_populates="customer")

class Ticket(Base):
    __tablename__ = 'tickets'
    id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey('customers.id'))
    issue = Column(String)
    status = Column(String) # Open, Resolved, Escalated
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="tickets")

class Setting(Base):
    __tablename__ = 'settings'
    key = Column(String, primary_key=True)
    value = Column(Text)


engine_url = os.getenv("DB_PATH", "sqlite:///./support_agent.db")
engine = create_engine(engine_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
