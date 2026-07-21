from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String(30), nullable=False, unique=True, index=True)

    # Gönderici bilgileri
    sender_customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=True)
    customer_name = Column(String(150), nullable=False)       # Gönderici adı (hızlı giriş)
    customer_phone = Column(String(20), nullable=True)

    # Alıcı bilgileri
    receiver_customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=True)
    receiver_name = Column(String(150), nullable=True)
    receiver_phone = Column(String(20), nullable=True)

    # Teslimat adresi
    recipient_address = Column(Text, nullable=False)
    province_id = Column(Integer, ForeignKey("provinces.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    neighborhood = Column(String(150), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Ölçüler
    weight_kg = Column(Float, default=1.0)
    width_cm = Column(Float, nullable=True)   # En
    height_cm = Column(Float, nullable=True)  # Boy
    depth_cm = Column(Float, nullable=True)   # Derinlik
    desi = Column(Float, default=1.0)         # (En x Boy x Derinlik) / 3000

    # Fiyatlandırma
    tariff_id = Column(Integer, ForeignKey("tariffs.id"), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    base_price = Column(Float, nullable=True)
    discount_amount = Column(Float, default=0.0)
    total_price = Column(Float, nullable=True)
    is_paid = Column(Boolean, default=False)
    payment_method = Column(String(20), nullable=True)  # cash | card | cod (kapıda)

    # Durum ve Operasyon
    status = Column(String(30), default="pending")
    # pending | in_transit | out_for_delivery | delivered | failed | returned
    assigned_depot_id = Column(Integer, ForeignKey("depots.id"), nullable=True)
    courier_id = Column(Integer, ForeignKey("couriers.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("delivery_zones.id"), nullable=True)
    priority = Column(String(10), default="normal")   # low | normal | high | urgent
    notes = Column(Text, nullable=True)

    # Teslimat Onayı
    delivery_proof_url = Column(String(500), nullable=True)   # İmza/fotoğraf URL
    delivery_note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    estimated_delivery = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    province = relationship("Province", back_populates="orders")
    district = relationship("District", back_populates="orders")
    assigned_depot = relationship("Depot", back_populates="orders")
    courier = relationship("Courier", back_populates="orders")
    zone = relationship("DeliveryZone", back_populates="orders")
    sender = relationship("CustomerProfile", foreign_keys=[sender_customer_id])
    receiver = relationship("CustomerProfile", foreign_keys=[receiver_customer_id])
    tariff = relationship("Tariff")
    status_logs = relationship("OrderStatusLog", back_populates="order", cascade="all, delete-orphan")
    return_order = relationship("ReturnOrder", back_populates="original_order", uselist=False)


class OrderStatusLog(Base):
    """Her durum değişikliğini zaman damgasıyla kaydeder (Tracking History)."""
    __tablename__ = "order_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    status = Column(String(30), nullable=False)
    location_note = Column(String(300), nullable=True)  # "İstanbul Anadolu Dağıtım Merkezi"
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="status_logs")


class ReturnOrder(Base):
    """Iade kargo kaydı."""
    __tablename__ = "return_orders"

    id = Column(Integer, primary_key=True, index=True)
    return_tracking_number = Column(String(30), nullable=False, unique=True, index=True)
    original_order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    reason = Column(String(300), nullable=True)   # Müşteri talebi, hasarlı ürün, yanlış adres
    status = Column(String(30), default="pending")  # pending | picked_up | received | completed
    courier_id = Column(Integer, ForeignKey("couriers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    original_order = relationship("Order", back_populates="return_order")
    courier = relationship("Courier")
