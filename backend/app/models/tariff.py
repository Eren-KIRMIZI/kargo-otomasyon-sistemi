from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime

class Tariff(Base):
    __tablename__ = "tariffs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    base_price = Column(Float, nullable=False, default=50.0) # Sabit açılış ücreti
    price_per_kg = Column(Float, nullable=False, default=10.0)
    price_per_desi = Column(Float, nullable=False, default=12.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_percentage = Column(Float, nullable=False, default=0.0) # Yüzde bazlı indirim (örn: 15.0 = %15)
    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
