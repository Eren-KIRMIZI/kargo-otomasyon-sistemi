"""
200 örnek sipariş + 180 geçmiş kayıt (AI eğitimi için).
"""
import os
import sys
import random
import string
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.database import SessionLocal
from app.models.order import Order
from app.models.history import OrderHistory
from app.models.location import Province

# (il_id, merkez_lat, merkez_lon, yarıçap_derece)
PROVINCE_CENTERS = {
    34: (41.0082, 28.9784, 0.4),   # İstanbul
    6:  (39.9334, 32.8597, 0.3),   # Ankara
    35: (38.4192, 27.1287, 0.25),  # İzmir
    16: (40.1826, 29.0665, 0.2),   # Bursa
    7:  (36.8969, 30.7133, 0.2),   # Antalya
    27: (37.0662, 37.3833, 0.2),   # Gaziantep
    42: (37.8667, 32.4833, 0.2),   # Konya
    55: (41.2867, 36.3300, 0.2),   # Samsun
    38: (38.7312, 35.4787, 0.2),   # Kayseri
    33: (36.8121, 34.6415, 0.2),   # Mersin
}

STATUSES = ["pending", "pending", "in_transit", "out_for_delivery", "delivered", "delivered", "failed"]
PRIORITIES = ["low", "normal", "normal", "normal", "high", "urgent"]

RECEIVER_NAMES = [
    "Selin Yıldız", "Burak Arslan", "Neslihan Doğan", "Cenk Polat", "Pınar Şahin",
    "Uğur Çelik", "Derya Kaya", "Mert Yaman", "Sibel Güler", "Gökhan Öztürk",
    "Merve Ateş", "Tolga Çakır", "Elif Bulut", "Volkan Koç", "Hande Aslan",
    "İlker Koca", "Aylin Toprak", "Umut Güneş", "Canan Tekin", "Yasin Uysal",
    "Deniz Avcı", "Recep Yaman", "Filiz Aydın", "Kerim Kaplan", "Nihal Erdoğan",
    "Ömer Şen", "Sema Özkan", "Murat Kurt", "Gülay Aktaş", "Yusuf Arslan",
]

CUSTOMER_NAMES = [
    "Ahmet Kaya", "Fatma Demir", "Mehmet Yılmaz", "Ayşe Çelik", "Mustafa Şahin",
    "Zeynep Arslan", "Ali Öztürk", "Emine Kurt", "Hüseyin Doğan", "Hatice Polat",
    "İbrahim Aydın", "Gülay Koç", "Yusuf Güler", "Sevim Aktaş", "Hasan Yaman",
    "Nalan Çakır", "Ömer Bulut", "Sema Ateş", "Recep Kaplan", "Filiz Aslan",
    "Kerim Uysal", "Nihal Erdoğan", "Selim Avcı", "Deniz Özkan", "Yasin Karahan",
    "Ceylan Şen", "Murat Tekin", "Pelin Güneş", "Ercan Koca", "Songül Toprak",
]


def _rand_coord(center_lat, center_lon, radius):
    lat = center_lat + random.uniform(-radius, radius)
    lon = center_lon + random.uniform(-radius, radius)
    return round(lat, 5), round(lon, 5)


def _tracking():
    return "KRG" + "".join(random.choices(string.digits, k=10))


def seed_orders():
    db = SessionLocal()
    try:
        if db.query(Order).count() > 0:
            print("✓ Sipariş verisi zaten mevcut, atlanıyor...")
            return

        province_ids = list(PROVINCE_CENTERS.keys())
        now = datetime.utcnow()

        # Tariff ID=1 (Standart) varsayılan olarak kullanılır
        TARIFF_BASE = 35.0
        TARIFF_PER_KG = 12.0

        for i in range(200):
            prov_id = random.choice(province_ids)
            c_lat, c_lon, radius = PROVINCE_CENTERS[prov_id]
            lat, lon = _rand_coord(c_lat, c_lon, radius)
            status = random.choice(STATUSES)
            # Daha geniş aralık: son 60 gün — son 7 güne daha fazla sipariş düşsün
            created_at = now - timedelta(days=random.randint(0, 60))

            depot_map = {34: 1, 6: 3, 35: 4, 16: 5, 7: 6, 27: 7, 42: 8, 55: 9, 38: 10, 33: 1}
            assigned_depot = depot_map.get(prov_id)

            weight_kg = round(random.uniform(0.2, 30.0), 2)
            desi = round(random.uniform(1.0, 100.0), 2)
            billable = max(weight_kg, desi)
            base_price = round(TARIFF_BASE + billable * TARIFF_PER_KG, 2)
            total_price = base_price

            order = Order(
                tracking_number=_tracking(),
                customer_name=random.choice(CUSTOMER_NAMES),
                customer_phone=f"05{random.randint(30,59)}{random.randint(1000000,9999999)}",
                receiver_name=random.choice(RECEIVER_NAMES),
                receiver_phone=f"05{random.randint(30,59)}{random.randint(1000000,9999999)}",
                recipient_address=f"Örnek Mah. {random.randint(1,200)}. Sok. No:{random.randint(1,50)}",
                province_id=prov_id,
                latitude=lat,
                longitude=lon,
                weight_kg=weight_kg,
                desi=desi,
                tariff_id=1,
                base_price=base_price,
                discount_amount=0.0,
                total_price=total_price,
                is_paid=random.choice([True, True, False]),
                status=status,
                assigned_depot_id=assigned_depot if status != "pending" else None,
                priority=random.choice(PRIORITIES),
                created_at=created_at,
                estimated_delivery=created_at + timedelta(days=random.randint(1, 3)) if status != "pending" else None,
                delivered_at=created_at + timedelta(days=random.randint(1, 4)) if status == "delivered" else None,
            )
            db.add(order)

        db.commit()
        print("✓ 200 sipariş yüklendi.")

        # --- Geçmiş veri (AI eğitimi) ---
        if db.query(OrderHistory).count() > 0:
            print("✓ Geçmiş veri zaten mevcut.")
            return

        for _ in range(360):
            prov_id = random.choice(province_ids)
            days_ago = random.randint(1, 365)
            date = now - timedelta(days=days_ago)
            history = OrderHistory(
                province_id=prov_id,
                order_date=date,
                order_count=random.randint(10, 500),
                avg_weight=round(random.uniform(0.5, 15.0), 2),
                avg_delivery_hours=round(random.uniform(4.0, 72.0), 2),
                traffic_level=round(random.uniform(0.1, 1.0), 2),
                distance_km=round(random.uniform(1.0, 400.0), 2),
                day_of_week=date.weekday(),
                month=date.month,
                is_holiday=1 if date.weekday() >= 5 else 0,
                weather_score=round(random.uniform(0.5, 1.0), 2),
            )
            db.add(history)

        db.commit()
        print("✓ 360 geçmiş kayıt yüklendi.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_orders()
