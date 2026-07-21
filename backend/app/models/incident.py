from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from datetime import datetime
from app.core.database import Base
import enum

class IncidentType(str, enum.Enum):
    lost = "lost"
    damaged = "damaged"
    complaint = "complaint"
    courier_report = "courier_report"

class IncidentStatus(str, enum.Enum):
    open = "open"
    investigating = "investigating"
    resolved = "resolved"

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False) # IncidentType
    status = Column(String(50), nullable=False, default=IncidentStatus.open.value)
    
    # İlgili kayıtlar (opsiyonel)
    tracking_number = Column(String(100), index=True, nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    courier_id = Column(Integer, ForeignKey("couriers.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Şikayeti açan müşteri
    
    description = Column(Text, nullable=False)
    admin_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
