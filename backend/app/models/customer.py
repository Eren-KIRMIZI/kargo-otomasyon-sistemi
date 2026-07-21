from app.core.database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

class CustomerType(str, enum.Enum):
    INDIVIDUAL = "individual"
    CORPORATE = "corporate"

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    customer_type = Column(String(20), default=CustomerType.INDIVIDUAL)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Kurumsal Müşteriler İçin
    company_name = Column(String(200), nullable=True)
    tax_office = Column(String(100), nullable=True)
    tax_number = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    wallet_balance = Column(Float, default=0.0)

    user = relationship("User", back_populates="customer_profile")
    addresses = relationship("AddressBook", back_populates="customer", cascade="all, delete-orphan")

class AddressBook(Base):
    __tablename__ = "address_book"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=False)
    title = Column(String(100), nullable=False)  # Ev, İş, Depo vb.
    address_line = Column(String(500), nullable=False)
    province_id = Column(Integer, ForeignKey("provinces.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    neighborhood = Column(String(150), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("CustomerProfile", back_populates="addresses")
    province = relationship("Province")
    district = relationship("District")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=False)
    amount = Column(Float, nullable=False)  # positive for deposit, negative for deduction
    transaction_type = Column(String(50), nullable=False) # 'deposit', 'payment', 'refund'
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("CustomerProfile")

class ReturnCode(Base):
    __tablename__ = "return_codes"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=False)
    code = Column(String(30), unique=True, index=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("CustomerProfile")

