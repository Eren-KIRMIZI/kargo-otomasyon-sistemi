"""
10 örnek depo verisi — Türkiye'nin büyük şehirlerinde.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.database import SessionLocal
from app.models.depot import Depot

DEPOTS = [
    {"name": "İstanbul Anadolu Dağıtım Merkezi", "code": "IST-A", "province_id": 34, "latitude": 40.9923, "longitude": 29.1244, "capacity": 5000, "manager_name": "Ahmet Yılmaz", "phone": "0216 555 01 01", "address": "Pendik, İstanbul"},
    {"name": "İstanbul Avrupa Dağıtım Merkezi", "code": "IST-E", "province_id": 34, "latitude": 41.0195, "longitude": 28.8897, "capacity": 4500, "manager_name": "Fatma Demir", "phone": "0212 555 02 02", "address": "Bağcılar, İstanbul"},
    {"name": "Ankara Merkez Depo", "code": "ANK-M", "province_id": 6, "latitude": 39.9334, "longitude": 32.8597, "capacity": 3000, "manager_name": "Mehmet Kaya", "phone": "0312 555 03 03", "address": "Keçiören, Ankara"},
    {"name": "İzmir Batı Dağıtım Merkezi", "code": "IZM-B", "province_id": 35, "latitude": 38.4192, "longitude": 27.1287, "capacity": 2500, "manager_name": "Ayşe Çelik", "phone": "0232 555 04 04", "address": "Bornova, İzmir"},
    {"name": "Bursa Lojistik Merkezi", "code": "BRS-L", "province_id": 16, "latitude": 40.1826, "longitude": 29.0665, "capacity": 2000, "manager_name": "Hasan Öztürk", "phone": "0224 555 05 05", "address": "Nilüfer, Bursa"},
    {"name": "Antalya Dağıtım Noktası", "code": "ANT-D", "province_id": 7, "latitude": 36.8969, "longitude": 30.7133, "capacity": 1800, "manager_name": "Zeynep Arslan", "phone": "0242 555 06 06", "address": "Muratpaşa, Antalya"},
    {"name": "Gaziantep Güneydoğu Merkezi", "code": "GAZ-G", "province_id": 27, "latitude": 37.0662, "longitude": 37.3833, "capacity": 2200, "manager_name": "Ali Şahin", "phone": "0342 555 07 07", "address": "Şahinbey, Gaziantep"},
    {"name": "Konya İç Anadolu Deposu", "code": "KON-I", "province_id": 42, "latitude": 37.8667, "longitude": 32.4833, "capacity": 1500, "manager_name": "Emine Yıldız", "phone": "0332 555 08 08", "address": "Selçuklu, Konya"},
    {"name": "Samsun Karadeniz Merkezi", "code": "SAM-K", "province_id": 55, "latitude": 41.2867, "longitude": 36.3300, "capacity": 1600, "manager_name": "Murat Doğan", "phone": "0362 555 09 09", "address": "Atakum, Samsun"},
    {"name": "Kayseri Orta Anadolu Deposu", "code": "KAY-O", "province_id": 38, "latitude": 38.7312, "longitude": 35.4787, "capacity": 1400, "manager_name": "Selin Aydın", "phone": "0352 555 10 10", "address": "Melikgazi, Kayseri"},
]


def seed_depots():
    db = SessionLocal()
    try:
        if db.query(Depot).count() > 0:
            print("✓ Depo verisi zaten mevcut, atlanıyor...")
            return

        for d in DEPOTS:
            depot = Depot(**d)
            db.add(depot)

        db.commit()
        print(f"✓ {len(DEPOTS)} depo yüklendi.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_depots()
