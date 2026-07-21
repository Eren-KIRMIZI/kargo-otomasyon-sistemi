import asyncio
import json
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

from app.core.database import SessionLocal
from app.models.courier import Courier
from app.models.order import Order
from app.models.vehicle import Vehicle
from app.api.routes.live_tracking import _estimate_eta

manager = ConnectionManager()

# Sıfırla — yeniden başlatmada eski koordinatlar temizlenir
mock_couriers: dict = {}

def _get_live_data():
    db = SessionLocal()
    try:
        # Gerçek kuryeleri al
        couriers = db.query(Courier).filter(Courier.status == "on_delivery").all()
        live_data = []
        for c in couriers:
            if c.latitude is not None and c.longitude is not None:
                c.latitude += random.uniform(-0.0005, 0.0005)
                c.longitude += random.uniform(-0.0005, 0.0005)
            else:
                c.latitude = 41.0
                c.longitude = 28.9
            
            active_orders = db.query(Order).filter(
                Order.courier_id == c.id, 
                Order.status.in_(["out_for_delivery", "in_transit"])
            ).all()
            
            current_order = active_orders[0] if active_orders else None
            target_lat = current_order.latitude if current_order else None
            target_lon = current_order.longitude if current_order else None
            
            package_count = len(active_orders)
            eta = _estimate_eta(package_count) if package_count > 0 else None
            
            vehicle_info = None
            if c.vehicle_id:
                v = db.query(Vehicle).filter(Vehicle.id == c.vehicle_id).first()
                if v:
                    capacity = v.capacity_kg or 100.0
                    total_weight = sum((o.weight_kg or 0) for o in active_orders)
                    load_pct = min(round((total_weight / capacity) * 100, 1), 100) if capacity > 0 else 0
                    vehicle_info = {"id": v.id, "plate": v.plate, "type": v.type, "load_pct": load_pct}
            
            live_data.append({
                "id": c.id,
                "name": c.name,
                "lat": c.latitude,
                "lng": c.longitude,
                "status": c.status,
                "target_lat": target_lat,
                "target_lon": target_lon,
                "package_count": package_count,
                "eta": eta,
                "vehicle": vehicle_info
            })
            
        # ─── Türkiye geneli depo şehirleri — kara koordinat listesi ──────────
        # Her şehir: (lat, lon, plaka_kodu, ağırlık)
        # Ağırlık = o şehre atanacak araç oranı (toplam 30 araç dağıtılır)
        CITY_POINTS: dict = {
            "İstanbul": {
                "plate": "34",
                "weight": 10,   # En yoğun — 2 depo var
                "points": [
                    # Avrupa Yakası
                    (41.0766, 28.9786),  # Şişli
                    (41.0614, 28.9892),  # Beyoğlu
                    (41.0422, 28.9879),  # Fatih
                    (41.0170, 28.9500),  # Zeytinburnu
                    (41.0200, 28.8900),  # Bağcılar
                    (41.0350, 28.8700),  # Güngören
                    (41.0700, 28.8400),  # Esenler
                    (41.0300, 28.9200),  # Eyüpsultan
                    (41.0980, 29.0200),  # Sarıyer
                    (41.0680, 29.0050),  # Kağıthane
                    # Anadolu Yakası
                    (41.0150, 29.1300),  # Üsküdar
                    (40.9800, 29.1000),  # Kadıköy
                    (40.9900, 29.1800),  # Ataşehir
                    (40.9750, 29.2500),  # Maltepe
                    (40.9600, 29.3000),  # Kartal
                    (40.9450, 29.3700),  # Pendik
                    (41.0450, 29.1050),  # Beykoz
                    (41.0100, 29.2200),  # Sancaktepe
                    (40.9500, 29.1300),  # Sultanbeyli
                ],
            },
            "Ankara": {
                "plate": "06",
                "weight": 5,
                "points": [
                    (39.9334, 32.8597),  # Keçiören — depo
                    (39.9208, 32.8541),  # Ulus
                    (39.9179, 32.8628),  # Altındağ
                    (39.9500, 32.8900),  # Mamak
                    (39.8800, 32.8500),  # Çankaya
                    (39.9100, 32.7900),  # Etimesgut
                    (39.9400, 32.7700),  # Sincan
                    (39.8500, 32.8900),  # Gölbaşı
                    (39.9700, 32.9100),  # Pursaklar
                ],
            },
            "İzmir": {
                "plate": "35",
                "weight": 4,
                "points": [
                    (38.4192, 27.1287),  # Bornova — depo
                    (38.4237, 27.1428),  # Karşıyaka
                    (38.4563, 27.1587),  # Çiğli
                    (38.3920, 27.0500),  # Konak
                    (38.3700, 27.0900),  # Buca
                    (38.4900, 27.1200),  # Menemen
                    (38.3200, 27.1500),  # Gaziemir
                    (38.4000, 27.2200),  # Bayraklı
                ],
            },
            "Bursa": {
                "plate": "16",
                "weight": 3,
                "points": [
                    (40.1826, 29.0665),  # Nilüfer — depo
                    (40.1885, 29.0610),  # Osmangazi
                    (40.2100, 29.0400),  # Yıldırım
                    (40.1600, 29.1000),  # Mudanya yolu
                    (40.2300, 29.0100),  # Gemlik çıkışı
                    (40.1400, 29.0800),  # Görükle
                ],
            },
            "Antalya": {
                "plate": "07",
                "weight": 3,
                "points": [
                    (36.8969, 30.7133),  # Muratpaşa — depo
                    (36.9081, 30.6956),  # Konyaaltı
                    (36.8800, 30.7200),  # Lara
                    (36.9300, 30.7500),  # Kepez
                    (36.9500, 30.7800),  # Döşemealtı
                    (36.8600, 30.6800),  # Aksu
                ],
            },
            "Gaziantep": {
                "plate": "27",
                "weight": 3,
                "points": [
                    (37.0662, 37.3833),  # Şahinbey — depo
                    (37.0600, 37.3600),  # Şehitkamil
                    (37.0900, 37.4000),  # Nizip yolu
                    (37.0400, 37.3700),  # Güneykent
                    (37.0750, 37.3400),  # Üniversite
                    (37.0200, 37.4100),  # Nurdağı yolu
                ],
            },
            "Konya": {
                "plate": "42",
                "weight": 2,
                "points": [
                    (37.8667, 32.4833),  # Selçuklu — depo
                    (37.8700, 32.4950),  # Karatay
                    (37.8500, 32.4700),  # Meram
                    (37.8900, 32.5100),  # Ereğli yolu
                    (37.8300, 32.4600),  # Akşehir yolu
                ],
            },
            "Samsun": {
                "plate": "55",
                "weight": 2,
                "points": [
                    (41.2867, 36.3300),  # Atakum — depo
                    (41.2800, 36.3600),  # İlkadım
                    (41.2600, 36.3900),  # Canik
                    (41.3000, 36.3100),  # Tekkeköy
                    (41.2500, 36.3500),  # Ondokuzmayıs yolu
                ],
            },
            "Kayseri": {
                "plate": "38",
                "weight": 2,
                "points": [
                    (38.7312, 35.4787),  # Melikgazi — depo
                    (38.7200, 35.4900),  # Kocasinan
                    (38.7500, 35.5100),  # Talas
                    (38.7100, 35.4600),  # Hacılar
                    (38.7600, 35.4400),  # Erciyes yolu
                ],
            },
        }

        # Ağırlıklı rastgele şehir + nokta seçimi
        _city_names = list(CITY_POINTS.keys())
        _city_weights = [CITY_POINTS[c]["weight"] for c in _city_names]
        _total_weight = sum(_city_weights)
        _city_probs = [w / _total_weight for w in _city_weights]

        def _random_city_point():
            """Ağırlıklı olarak depo şehirlerinden nokta seç."""
            city_name = random.choices(_city_names, weights=_city_probs, k=1)[0]
            city = CITY_POINTS[city_name]
            base = random.choice(city["points"])
            return (
                base[0] + random.uniform(-0.006, 0.006),
                base[1] + random.uniform(-0.006, 0.006),
                city_name,
                city["plate"],
            )

        # Simüle edilmiş (Mock) kuryeler ekle (En az 30 araç görünmesi için)
        global mock_couriers
        target_mock_count = max(0, 30 - len(live_data))

        while len(mock_couriers) < target_mock_count:
            mc_id = f"mock-{random.randint(1000, 9999)}"
            s_lat, s_lng, city_name, plate_prefix = _random_city_point()
            t_lat, t_lng, _, _ = _random_city_point()
            # Araçlar aynı şehir içinde hareket etsin (hedef de aynı şehirden)
            t_lat, t_lng, _, _ = (
                lambda c: (
                    c[0] + random.uniform(-0.006, 0.006),
                    c[1] + random.uniform(-0.006, 0.006),
                    None, None,
                )
            )(random.choice(CITY_POINTS[city_name]["points"]))

            mock_couriers[mc_id] = {
                "id": mc_id,
                "name": f"Kurye {random.choice(['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Ali', 'Veli', 'Can', 'Cem', 'Hasan', 'Zeynep'])}",
                "lat": s_lat,
                "lng": s_lng,
                "city": city_name,
                "status": "on_delivery",
                "target_lat": t_lat,
                "target_lon": t_lng,
                "package_count": random.randint(3, 35),
                "vehicle": {
                    "id": random.randint(100, 999),
                    "plate": f"{plate_prefix} {random.choice(['ABC', 'DEF', 'GHI', 'XYZ', 'KRT', 'MST', 'YLD', 'DNZ'])} {random.randint(100, 999)}",
                    "type": random.choice(["van", "truck", "motorcycle"]),
                    "load_pct": random.randint(25, 95),
                },
            }

        for mc_id, mc in list(mock_couriers.items()):
            lat_diff = mc["target_lat"] - mc["lat"]
            lon_diff = mc["target_lon"] - mc["lng"]
            dist = (lat_diff ** 2 + lon_diff ** 2) ** 0.5

            if dist < 0.008:  # Hedefe ulaştı — aynı şehirde yeni nokta seç
                city_name = mc.get("city", "İstanbul")
                if city_name not in CITY_POINTS:
                    city_name = "İstanbul"
                new_base = random.choice(CITY_POINTS[city_name]["points"])
                mc["target_lat"] = new_base[0] + random.uniform(-0.006, 0.006)
                mc["target_lon"] = new_base[1] + random.uniform(-0.006, 0.006)
                mc["package_count"] = max(0, mc["package_count"] - 1)
                if mc["package_count"] == 0:
                    mc["package_count"] = random.randint(8, 35)
                    mc["vehicle"]["load_pct"] = random.randint(50, 100)
            else:  # Hedefe doğru hareket et
                step = 0.007
                mc["lat"] += (lat_diff / dist) * step
                mc["lng"] += (lon_diff / dist) * step

            mc["eta"] = _estimate_eta(mc["package_count"])
            live_data.append(mc)

        while len(mock_couriers) > target_mock_count:
            mock_couriers.pop(list(mock_couriers.keys())[0])


        return live_data
    except Exception as e:
        print("WS Error:", e)
        return []
    finally:
        db.close()


async def live_tracking_task():
    """Arka planda çalışarak kuryelerin pozisyonunu DB'den okuyup yayınlar."""
    while True:
        await asyncio.sleep(1)
        
        if manager.active_connections:
            live_data = await asyncio.to_thread(_get_live_data)
            if live_data:
                await manager.broadcast(json.dumps({
                    "type": "COURIER_LOCATION_UPDATE",
                    "data": live_data
                }))


@router.websocket("/ws/couriers")
async def websocket_couriers(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/ws/reset-mock", tags=["WebSocket"])
def reset_mock_vehicles():
    """Mevcut mock araçları temizle — yeni şehirler aktif olsun."""
    global mock_couriers
    mock_couriers.clear()
    return {"status": "ok", "message": "Mock araçlar sıfırlandı"}
