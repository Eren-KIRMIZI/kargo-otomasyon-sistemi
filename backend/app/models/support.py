from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.core.database import Base

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # open, answered, resolved
    status = Column(String(50), nullable=False, default="open")
    admin_response = Column(Text, nullable=True)
    
    # Yeni eklenen alanlar (Chatbot & SLA)
    priority = Column(String(50), nullable=False, default="normal") # low, normal, high, critical
    intent = Column(String(100), nullable=True) # Chatbot'un tespit ettiği konu
    is_escalated = Column(Boolean, nullable=False, default=False) # SLA İhlali
    
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
