from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime


class DeliveryZone(Base):
    __tablename__ = "delivery_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    algorithm = Column(String(20), default="kmeans")  # kmeans | dbscan | manual
    cluster_id = Column(Integer, nullable=True)
    color = Column(String(10), default="#3B82F6")
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)
    geojson = Column(Text, nullable=True)  # GeoJSON polygon string
    order_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="zone", lazy="dynamic")
    zone_assignments = relationship("ZoneAssignment", back_populates="zone", lazy="dynamic")


class ZoneAssignment(Base):
    __tablename__ = "zone_assignments"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("delivery_zones.id"), nullable=False)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    is_primary = Column(Boolean, default=True)

    zone = relationship("DeliveryZone", back_populates="zone_assignments")
    depot = relationship("Depot", back_populates="zone_assignments")
