import os
import sys
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import SessionLocal
from app.models.customer import CustomerProfile, AddressBook
from app.models.tariff import Tariff, Campaign
from app.models.vehicle import Vehicle
from app.models.fleet import VehicleMaintenance, FuelLog
from app.models.warehouse import WarehouseRack as Rack, InventoryLog
from app.models.depot import Depot
from app.models.user import User

def seed_extended_features():
    db = SessionLocal()
    try:
        print("Müşteriler, Tarifeler, Araçlar ve Depo Rafları yükleniyor...")
        
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            return
            
        # 1. Tarifeler ve Kampanyalar
        if db.query(Tariff).count() == 0:
            t1 = Tariff(name="Standart Tarife", base_price=35.0, price_per_kg=12.0, price_per_desi=10.0, is_active=True)
            t2 = Tariff(name="Ekspres Tarife", base_price=50.0, price_per_kg=20.0, price_per_desi=18.0, is_active=True)
            db.add_all([t1, t2])
            db.commit()
            
            c1 = Campaign(name="Yaz İndirimi", code="YAZ2026", discount_percentage=15.0, start_date=datetime.now(), end_date=datetime.now() + timedelta(days=30), is_active=True)
            db.add(c1)
            db.commit()
            print(" ✓ Tarifeler ve Kampanyalar oluşturuldu.")
            
        # 2. Müşteriler
        if db.query(CustomerProfile).count() == 0:
            from app.core.security import get_password_hash
            # Kurumsal müşteri için ayrı kullanıcı oluştur
            corp_user = User(username="musteri", hashed_password=get_password_hash("123456"), is_superuser=False)
            db.add(corp_user)
            db.commit()

            c_corp = CustomerProfile(user_id=corp_user.id, customer_type="corporate", company_name="Trendyol", tax_number="1234567890", tax_office="Maslak")
            c_ind = CustomerProfile(user_id=admin_user.id, customer_type="individual", first_name="Eren", last_name="Kaya")
            db.add_all([c_corp, c_ind])
            db.commit()

            addr = AddressBook(customer_id=c_ind.id, title="Ev", address_line="Atatürk Mah. No:5", province_id=1, district_id=1)
            db.add(addr)
            db.commit()
            print(" ✓ Müşteriler ve Adresler oluşturuldu.")

        # 3. Araçlar (Filo)
        if db.query(Vehicle).count() == 0:
            depots = db.query(Depot).all()
            depot_id = depots[0].id if depots else None
            
            v1 = Vehicle(plate="34 ABC 123", brand="Ford", model="Transit", year=2021, vehicle_type="kamyonet", capacity_kg=1500, current_mileage=45000, depot_id=depot_id)
            v2 = Vehicle(plate="06 XYZ 987", brand="Mercedes", model="Sprinter", year=2020, vehicle_type="kamyon", capacity_kg=3500, current_mileage=120000, depot_id=depot_id)
            db.add_all([v1, v2])
            db.commit()
            
            maint = VehicleMaintenance(vehicle_id=v1.id, maintenance_type="Periyodik", description="Yağ ve filtre değişimi", scheduled_date=datetime.now(), status="completed")
            fuel = FuelLog(vehicle_id=v2.id, filled_at=datetime.now(), liters=50.5, total_cost=2000.0)
            db.add_all([maint, fuel])
            db.commit()
            print(" ✓ Araçlar ve Filo logları oluşturuldu.")
            
        # 4. Raflar ve Stok
        if db.query(Rack).count() == 0:
            depots = db.query(Depot).all()
            if depots:
                for d in depots[:2]: # İlk iki depoya raf ekle
                    r1 = Rack(depot_id=d.id, code=f"A-01-{d.id}", capacity=50, current_load=0)
                    r2 = Rack(depot_id=d.id, code=f"B-01-{d.id}", capacity=100, current_load=10)
                    db.add_all([r1, r2])
                db.commit()
                print(" ✓ Depo Rafları oluşturuldu.")

    except Exception as e:
        print(f"Hata oluştu: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_extended_features()
