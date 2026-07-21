"""
30 örnek kurye verisi.
"""
import os
import sys
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.database import SessionLocal
from app.models.courier import Courier
from app.models.vehicle import Vehicle

NAMES = [
    "Kemal Aydın", "Selin Çelik", "Burak Kaya", "Gamze Demir", "Tarık Şahin",
    "Neslihan Arslan", "Furkan Yıldız", "İrem Özdemir", "Cenk Doğan", "Pınar Koca",
    "Uğur Toprak", "Derya Polat", "Emre Koç", "Başak Güler", "Serkan Aktaş",
    "Tuba Yaman", "Mert Çakır", "Duygu Bulut", "Eren Ateş", "Sibel Kurt",
    "Gökhan Avcı", "Merve Özkan", "Tolga Karahan", "Elif Şen", "Volkan Tekin",
    "Hande Güneş", "İlker Kaplan", "Aylin Aslan", "Umut Uysal", "Canan Erdoğan",
]

VEHICLES = ["motorcycle", "car", "car", "van", "motorcycle"]
CAPACITIES = {"motorcycle": 50, "car": 150, "van": 800, "truck": 3000}
PLATES = [f"34{chr(65+i)}{random.randint(1000,9999)}" for i in range(30)]


def seed_couriers():
    db = SessionLocal()
    try:
        if db.query(Courier).count() > 0:
            print("✓ Kurye verisi zaten mevcut, atlanıyor...")
            return

        depot_assignments = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 9, 9, 10, 10, 1, 2, 3, 4]
        statuses = ["available", "available", "on_delivery", "available", "off_duty"]

        for i, name in enumerate(NAMES):
            v_type = random.choice(VEHICLES)
            vehicle = Vehicle(
                plate=PLATES[i],
                type=v_type,
                capacity_kg=CAPACITIES[v_type],
                brand="Renault" if v_type == "car" else "Honda",
                model="Clio" if v_type == "car" else "PCX",
            )
            db.add(vehicle)
            db.commit()
            db.refresh(vehicle)

            courier = Courier(
                name=name,
                phone=f"05{random.randint(30,59)} {random.randint(100,999)} {random.randint(1000,9999)}",
                depot_id=depot_assignments[i],
                vehicle_id=vehicle.id,
                status=random.choice(statuses),
                daily_delivery_limit=random.randint(20, 40),
                is_active=True,
            )
            db.add(courier)

        db.commit()
        print(f"✓ {len(NAMES)} kurye ve araç yüklendi.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_couriers()
