from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import random

from app.core.database import get_db
from app.models.vehicle import Vehicle
from app.models.courier import Courier
from app.models.order import Order

router = APIRouter(prefix="/live-tracking", tags=["Canlı Araç Takibi"])


def _estimate_eta(order_count: int, distance_km: float = None) -> str:
    """Paket sayısı ve mesafeye göre basit ETA tahmini."""
    base_minutes = random.randint(15, 45)
    extra = order_count * 3
    total = base_minutes + extra
    eta_time = datetime.utcnow() + timedelta(minutes=total)
    return eta_time.strftime("%H:%M")


@router.get("/vehicles")
def get_live_vehicles(db: Session = Depends(get_db)):
    """
    Aktif araçları canlı takip verisiyle döndürür.
    Her araç için: konum, paket sayısı, kurye bilgisi, ETA.
    """
    vehicles = db.query(Vehicle).filter(Vehicle.is_active == True).all()
    result = []

    for v in vehicles:
        # Araçla ilişkili aktif kurye
        courier = db.query(Courier).filter(
            Courier.vehicle_id == v.id,
            Courier.is_active == True
        ).first()

        # O kuryenin dağıtımdaki paketleri
        packages = []
        package_count = 0
        eta = None

        if courier:
            active_orders = db.query(Order).filter(
                Order.courier_id == courier.id,
                Order.status.in_(["out_for_delivery", "in_transit"])
            ).all()
            package_count = len(active_orders)
            packages = [
                {
                    "order_id": o.id,
                    "tracking_number": o.tracking_number,
                    "receiver_name": o.receiver_name,
                    "recipient_address": o.recipient_address,
                    "status": o.status,
                    "weight_kg": o.weight_kg,
                    "estimated_delivery": o.estimated_delivery.isoformat() if o.estimated_delivery else None,
                }
                for o in active_orders
            ]
            if package_count > 0:
                eta = _estimate_eta(package_count)

        # Araç doluluk yüzdesi
        capacity = v.capacity_kg or 100.0
        total_weight = sum(
            (o.weight_kg or 0) for o in db.query(Order).filter(
                Order.courier_id == (courier.id if courier else -1),
                Order.status.in_(["out_for_delivery", "in_transit"])
            ).all()
        ) if courier else 0
        load_pct = min(round((total_weight / capacity) * 100, 1), 100) if capacity > 0 else 0

        # Konum: kuryenin mevcut konumu ya da depot konumu
        lat = None
        lon = None
        if courier and courier.latitude:
            lat = courier.latitude
            lon = courier.longitude
        elif courier and courier.depot:
            lat = courier.depot.latitude
            lon = courier.depot.longitude

        result.append({
            "vehicle_id": v.id,
            "plate": v.plate,
            "type": v.type,
            "brand": v.brand,
            "model": v.model,
            "capacity_kg": v.capacity_kg,
            "status": v.status,
            "courier_id": courier.id if courier else None,
            "courier_name": courier.name if courier else None,
            "courier_status": courier.status if courier else None,
            "latitude": lat,
            "longitude": lon,
            "package_count": package_count,
            "load_kg": round(total_weight, 2),
            "load_pct": load_pct,
            "eta": eta,
            "packages": packages,
        })

    return result


@router.get("/vehicles/{vehicle_id}/packages")
def get_vehicle_packages(vehicle_id: int, db: Session = Depends(get_db)):
    """Belirli bir aracın taşıdığı paketlerin detaylarını döndürür."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Araç bulunamadı")

    courier = db.query(Courier).filter(
        Courier.vehicle_id == vehicle_id,
        Courier.is_active == True
    ).first()

    if not courier:
        return {"vehicle_id": vehicle_id, "packages": [], "total": 0}

    orders = db.query(Order).filter(
        Order.courier_id == courier.id,
        Order.status.in_(["out_for_delivery", "in_transit", "pending"])
    ).all()

    return {
        "vehicle_id": vehicle_id,
        "plate": vehicle.plate,
        "courier_name": courier.name,
        "packages": [
            {
                "order_id": o.id,
                "tracking_number": o.tracking_number,
                "receiver_name": o.receiver_name,
                "recipient_address": o.recipient_address,
                "weight_kg": o.weight_kg,
                "status": o.status,
                "priority": o.priority,
                "estimated_delivery": o.estimated_delivery.isoformat() if o.estimated_delivery else None,
                "latitude": o.latitude,
                "longitude": o.longitude,
            }
            for o in orders
        ],
        "total": len(orders),
    }


@router.get("/stats")
def get_tracking_stats(db: Session = Depends(get_db)):
    """Canlı takip özet istatistikleri."""
    total_vehicles = db.query(Vehicle).filter(Vehicle.is_active == True).count()
    active_vehicles = db.query(Vehicle).filter(
        Vehicle.is_active == True,
        Vehicle.status == "active"
    ).count()

    on_delivery_couriers = db.query(Courier).filter(
        Courier.status == "on_delivery",
        Courier.is_active == True
    ).count()

    active_packages = db.query(Order).filter(
        Order.status.in_(["out_for_delivery", "in_transit"])
    ).count()

    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "on_delivery_couriers": on_delivery_couriers,
        "active_packages": active_packages,
    }
