from app.core.database import Base
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime


class PriceAgreement(Base):
    """Kurumsal müşteriye özel anlaşmalı fiyat."""
    __tablename__ = "price_agreements"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=False)
    tariff_id   = Column(Integer, ForeignKey("tariffs.id"), nullable=True)
    name        = Column(String(200), nullable=False)     # Anlaşma adı
    discount_rate = Column(Float, default=0.0)            # % indirim oranı (0-100)
    price_per_kg  = Column(Float, nullable=True)          # Özel kg fiyatı (tarife yerine)
    min_volume    = Column(Integer, default=0)            # Minimum aylık sipariş adedi
    valid_from    = Column(DateTime, nullable=True)
    valid_until   = Column(DateTime, nullable=True)
    is_active     = Column(Boolean, default=True)
    notes         = Column(String(500), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("CustomerProfile")
    tariff   = relationship("Tariff")
