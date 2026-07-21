"""
Tüm seed işlemlerini sırayla çalıştırır.
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.core.database import init_db
from app.seed.location_seeder import seed_locations
from app.seed.depot_seeder import seed_depots
from app.seed.courier_seeder import seed_couriers
from app.seed.order_seeder import seed_orders
from app.seed.extended_seeder import seed_extended_features
from app.seed.additional_seeder import seed_additional_data

if __name__ == "__main__":
    print("=" * 50)
    print("  KargoEnterprise — Veritabanı Seed Başlatılıyor")
    print("=" * 50)
    print()

    print("1/7 — Tablolar oluşturuluyor...")
    init_db()
    print("✓ Tablolar hazır.")
    print()

    print("2/7 — İl/ilçe verileri yükleniyor...")
    seed_locations()
    print()

    print("3/7 — Depolar yükleniyor...")
    seed_depots()
    print()

    print("4/7 — Kuryeler yükleniyor...")
    seed_couriers()
    print()

    print("5/7 — Siparişler ve geçmiş veriler yükleniyor...")
    seed_orders()
    print()

    print("6/7 — Yeni Modüller (Müşteriler, Araçlar, Raflar, Tarifeler)...")
    seed_extended_features()
    print()

    print("7/7 — Ek veriler (Incidents, Destek, Transferler, Kampanyalar)...")
    seed_additional_data()
    print()

    print("=" * 50)
    print("  ✓ Seed işlemi tamamlandı!")
    print("=" * 50)

