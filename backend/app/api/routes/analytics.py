from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.database import get_db
from app.models.order import Order
from app.models.courier import Courier
from app.models.vehicle import Vehicle

router = APIRouter(prefix="/analytics", tags=["Analitik & Raporlama"])

@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard_analytics(days: int = 7, db: Session = Depends(get_db)):
    """Dashboard için gerekli olan analitik grafik verilerini döndürür."""
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days)
    
    # Günlük sipariş ve gelir trendi
    orders = db.query(Order).filter(Order.created_at >= start_date).all()
    
    daily_data = {}
    for i in range(days):
        d = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        daily_data[d] = {"date": d, "orders": 0, "revenue": 0.0, "delivered": 0}
        
    for o in orders:
        d = o.created_at.strftime("%Y-%m-%d")
        if d in daily_data:
            daily_data[d]["orders"] += 1
            if o.total_price:
                daily_data[d]["revenue"] += o.total_price
            if o.status == "delivered":
                daily_data[d]["delivered"] += 1

    trend_data = list(daily_data.values())

    # SLA Başarı Oranı (Tahmini teslimat zamanından önce veya o gün teslim edilenler)
    delivered_orders = [o for o in orders if o.status == "delivered"]
    sla_met = 0
    for o in delivered_orders:
        if o.estimated_delivery and o.delivered_at:
            if o.delivered_at.date() <= o.estimated_delivery.date():
                sla_met += 1
    
    sla_percentage = round((sla_met / len(delivered_orders)) * 100, 1) if delivered_orders else 100.0

    # Kurye Performans Özeti (En çok teslimat yapan 5 kurye)
    couriers = db.query(Courier).all()
    courier_performance = []
    for c in couriers:
        # Son 'days' gündeki teslimatları say
        c_delivered = sum(1 for o in delivered_orders if o.courier_id == c.id)
        if c_delivered > 0:
            courier_performance.append({
                "name": c.name,
                "deliveries": c_delivered
            })
            
    courier_performance = sorted(courier_performance, key=lambda x: x["deliveries"], reverse=True)[:5]

    # Filo Durumu Özeti
    total_vehicles = db.query(Vehicle).count()
    active_vehicles = db.query(Vehicle).filter(Vehicle.status == "active").count()
    maintenance_vehicles = db.query(Vehicle).filter(Vehicle.status == "maintenance").count()

    return {
        "trend_data": trend_data,
        "sla_percentage": sla_percentage,
        "courier_performance": courier_performance,
        "fleet_status": {
            "total": total_vehicles,
            "active": active_vehicles,
            "maintenance": maintenance_vehicles
        }
    }
