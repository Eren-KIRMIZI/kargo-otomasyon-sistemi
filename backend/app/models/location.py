from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship


class Province(Base):
    __tablename__ = "provinces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(Integer, nullable=False, unique=True)  # Plaka kodu
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    districts = relationship("District", back_populates="province", lazy="dynamic")
    depots = relationship("Depot", back_populates="province", lazy="dynamic")
    orders = relationship("Order", back_populates="province", lazy="dynamic")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    province_id = Column(Integer, ForeignKey("provinces.id"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    province = relationship("Province", back_populates="districts")
    neighborhoods = relationship("Neighborhood", back_populates="district", lazy="dynamic")
    orders = relationship("Order", back_populates="district", lazy="dynamic")


class Neighborhood(Base):
    __tablename__ = "neighborhoods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)

    district = relationship("District", back_populates="neighborhoods")
