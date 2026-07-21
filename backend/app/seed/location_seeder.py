"""
Türkiye il, ilçe verilerini veritabanına yükler.
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.database import SessionLocal, init_db
from app.models.location import Province, District


def seed_locations():
    db = SessionLocal()
    try:
        if db.query(Province).count() > 0:
            print("✓ Lokasyon verisi zaten mevcut, atlanıyor...")
            return

        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "turkey_locations.json")
        with open(data_path, encoding="utf-8") as f:
            provinces_data = json.load(f)

        for pdata in provinces_data:
            province = Province(
                id=pdata["id"],
                name=pdata["name"],
                code=pdata["code"],
                latitude=pdata.get("latitude"),
                longitude=pdata.get("longitude"),
            )
            db.add(province)
            db.flush()

            for idx, ddata in enumerate(pdata.get("districts", []), start=1):
                district = District(
                    name=ddata["name"],
                    province_id=province.id,
                    latitude=pdata.get("latitude"),
                    longitude=pdata.get("longitude"),
                )
                db.add(district)

        db.commit()
        print(f"✓ {len(provinces_data)} il ve ilçeleri yüklendi.")
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    seed_locations()
