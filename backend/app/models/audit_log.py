from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    timestamp   = Column(DateTime, default=datetime.utcnow, index=True)
    username    = Column(String(100), nullable=False, index=True)
    action      = Column(String(20), nullable=False, index=True)   # CREATE, UPDATE, DELETE, ASSIGN, LOGIN, LOGOUT
    module      = Column(String(60), nullable=False, index=True)   # Siparişler, Kuryeler, Araçlar, ...
    detail      = Column(Text, nullable=True)
    ip_address  = Column(String(45), nullable=True)
    user_id     = Column(Integer, nullable=True)
