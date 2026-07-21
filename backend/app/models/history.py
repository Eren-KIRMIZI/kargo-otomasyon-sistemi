from app.core.database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime


class OrderHistory(Base):
    __tablename__ = "order_history"

    id = Column(Integer, primary_key=True, index=True)
    province_id = Column(Integer, ForeignKey("provinces.id"), nullable=True)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=True)
    order_date = Column(DateTime, nullable=False)
    order_count = Column(Integer, default=0)
    avg_weight = Column(Float, default=1.0)
    avg_delivery_hours = Column(Float, default=24.0)
    traffic_level = Column(Float, default=0.5)   # 0.0 – 1.0
    distance_km = Column(Float, default=10.0)
    day_of_week = Column(Integer, default=0)      # 0=Mon … 6=Sun
    month = Column(Integer, default=1)
    is_holiday = Column(Integer, default=0)       # 0|1
    weather_score = Column(Float, default=1.0)    # 0.0 – 1.0 (1 = iyi hava)

    province = relationship("Province")
    district = relationship("District")
