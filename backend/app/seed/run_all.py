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

if __name__ == "__main__":
    print("=" * 50)
    print("  KargoEnterprise — Veritabanı Seed Başlatılıyor")
    print("=" * 50)
    print()

    print("1/6 — Tablolar oluşturuluyor...")
    init_db()
    print("✓ Tablolar hazır.")
    print()

    print("2/6 — İl/ilçe verileri yükleniyor...")
    seed_locations()
    print()

    print("3/6 — Depolar yükleniyor...")
    seed_depots()
    print()

    print("4/6 — Kuryeler yükleniyor...")
    seed_couriers()
    print()

    print("5/6 — Siparişler ve geçmiş veriler yükleniyor...")
    seed_orders()
    print()

    print("6/6 — Yeni Modüller (Müşteriler, Araçlar, Raflar, Tarifeler)...")
    seed_extended_features()
    print()

    print("=" * 50)
    print("  ✓ Seed işlemi tamamlandı!")
    print("=" * 50)

