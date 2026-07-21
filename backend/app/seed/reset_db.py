"""
Tüm tabloları siler ve yeniden oluşturur.
UYARI: Tüm veriler silinir!
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.database import Base, engine

# Tüm model modüllerini yükle (metadata'ya kaydetmek için)
from app.models import (  # noqa: F401
    location, depot, courier, order, zone, history,
    vehicle, user, customer, tariff, warehouse, fleet,
)

print("⚠️  Tüm tablolar siliniyor...")
Base.metadata.drop_all(bind=engine)
print("✓ Tablolar silindi.")

print("🔨 Tablolar yeniden oluşturuluyor...")
Base.metadata.create_all(bind=engine)
print("✓ Tablolar oluşturuldu.")

print("\n✅ Veritabanı sıfırlama tamamlandı. Şimdi run_all.py çalıştırabilirsiniz.")
