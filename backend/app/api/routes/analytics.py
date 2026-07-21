import json
import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Dict, Any

from app.core.database import get_db
from app.core.redis_client import redis_get, redis_set
from app.core.config import settings
from app.models.order import Order
from app.models.courier import Courier
from app.models.vehicle import Vehicle

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analitik & Raporlama"])

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_analytics(days: int = 7, db: Session = Depends(get_db)):
    """
    Dashboard için gerekli olan analitik grafik verilerini döndürür.
    Redis Cache: {REDIS_ANALYTICS_CACHE_TTL} saniye — her dakika bir taze veri.
    """
    # ─── Redis Cache Kontrolü ──────────────────────────────────────────────
    cache_key = f"analytics:dashboard:{days}"
    cached_raw = await redis_get(cache_key)
    if cached_raw:
        try:
            result = json.loads(cached_raw)
            result["cache_hit"] = True
            logger.debug(f"Analytics Cache HIT: days={days}")
            return result
        except Exception:
            pass
    # ───────────────────────────────────────────────────────────────────────

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

    # SLA Başarı Oranı
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

    result = {
        "trend_data": trend_data,
        "sla_percentage": sla_percentage,
        "courier_performance": courier_performance,
        "fleet_status": {
            "total": total_vehicles,
            "active": active_vehicles,
            "maintenance": maintenance_vehicles
        },
        "cache_hit": False,
    }

    # ─── Redis'e Kaydet ────────────────────────────────────────────────────
    try:
        await redis_set(
            cache_key,
            json.dumps(result, ensure_ascii=False, default=str),
            ttl_seconds=settings.REDIS_ANALYTICS_CACHE_TTL,
        )
        logger.debug(f"Analytics Cache SET: days={days}, TTL={settings.REDIS_ANALYTICS_CACHE_TTL}sn")
    except Exception as exc:
        logger.warning(f"Analytics cache yazma hatası: {exc}")
    # ───────────────────────────────────────────────────────────────────────

    return result

