"""
Ek seed verileri: Incidents, Support Tickets, Transfers, Inventory Logs, Campaigns, Courier GPS.
Mevcut veriyle cakismadan tamamlayici veri ekler.
"""
import os
import sys
import random
import string
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import SessionLocal
from app.models.incident import Incident
from app.models.support import SupportTicket
from app.models.warehouse import Transfer, InventoryLog, WarehouseRack
from app.models.tariff import Campaign
from app.models.courier import Courier


INCIDENT_DATA = [
    {"type": "lost", "description": "Kargo adrese ulasmadi, musteri 3 kez aradi.", "status": "open"},
    {"type": "damaged", "description": "Paket hasarli teslim edildi, alici imzalamayi reddetti.", "status": "investigating"},
    {"type": "complaint", "description": "Kurye kapiya cikmadan 'teslim edildi' isaretlemis.", "status": "resolved"},
    {"type": "courier_report", "description": "Adres bulunamadi, bina numarasi yanlis.", "status": "resolved"},
    {"type": "damaged", "description": "Elektronik urun kirik kutuda geldi.", "status": "open"},
    {"type": "complaint", "description": "Kurye cok gec saatte kapiya geldi (23:00).", "status": "resolved"},
    {"type": "lost", "description": "Transfer surecinde kargo kayboldu.", "status": "investigating"},
    {"type": "complaint", "description": "Musteri SMS bildirimi almadigini belirtti.", "status": "open"},
    {"type": "courier_report", "description": "Guzergah uzerinde yol calismasi nedeniyle gecikme.", "status": "resolved"},
    {"type": "damaged", "description": "Kargo islak geldi, icerik zarar gordu.", "status": "investigating"},
    {"type": "complaint", "description": "Yanlis kargo teslim edildi.", "status": "open"},
    {"type": "lost", "description": "Depo transferi sirasinda raf kaydi hatali.", "status": "open"},
    {"type": "courier_report", "description": "Arac arizasi nedeniyle 2 saatlik gecikme.", "status": "resolved"},
    {"type": "complaint", "description": "Kampanya indirimi faturaya yansimaidi.", "status": "investigating"},
    {"type": "damaged", "description": "Cam esya kirik ulasti, fotograf eklendi.", "status": "open"},
    {"type": "complaint", "description": "Kapida odeme secenegi sunulmadi.", "status": "resolved"},
    {"type": "courier_report", "description": "Teslimat noktasinda guvenlik erisim izni yok.", "status": "open"},
    {"type": "lost", "description": "Iade kargosu depoya ulasmadi.", "status": "investigating"},
    {"type": "complaint", "description": "Takip numarasi guncellenmiyor.", "status": "resolved"},
    {"type": "damaged", "description": "Paket deformasyonlu, icerik kontrol gerekiyor.", "status": "open"},
]

SUPPORT_DATA = [
    {"subject": "Kargom nerede?", "message": "3 gun oldu hala gelmedi, takip numarasina bakiyorum ama hareket yok.", "status": "open", "priority": "high"},
    {"subject": "Iade talebi", "message": "Yanlis urun gonderildi, iade acmak istiyorum.", "status": "answered", "priority": "normal", "admin_response": "Iade talebiniz alindi, 2 is gunu icinde kurye gelecek."},
    {"subject": "Hasarli urun", "message": "Kargo acildiginda urun kirik cikti. Fotograf yukledim.", "status": "open", "priority": "high"},
    {"subject": "Fatura sorunu", "message": "Indirim kodu uygulanmadi, faturamda fazla ucret var.", "status": "resolved", "priority": "normal", "admin_response": "Ucret iadeniz 3 is gunu icinde yapilacak."},
    {"subject": "Adres degisikligi", "message": "Siparis verdikten sonra teslimat adresini degistirebilir miyim?", "status": "answered", "priority": "low", "admin_response": "Siparis depoya ulasmadan adres degistirilebilir. Bizi arayin."},
    {"subject": "Kurye ile iletisim", "message": "Kurye kapida yoktu diyor ama ben evdeydim.", "status": "open", "priority": "high"},
    {"subject": "Hesap sorunu", "message": "Sifremi unuttum, mail gelmiyor.", "status": "resolved", "priority": "normal", "admin_response": "Sifre sifirlama maili gonderildi."},
    {"subject": "Kargo gecikmesi", "message": "Tahmini teslimat tarihi gecti, ne zaman gelecek?", "status": "open", "priority": "normal"},
    {"subject": "Toplu gonderi talebi", "message": "Ayda 500+ kargo gonderecegtiz, kurumsal anlasma nasil yapilir?", "status": "answered", "priority": "low", "admin_response": "Satis ekibimiz sizi 24 saat icinde arayacak."},
    {"subject": "Teslimat kaniti", "message": "Kargo teslim edildi diyor ama ben almadim, imza kim atti?", "status": "investigating", "priority": "critical"},
    {"subject": "Kampanya kodu calismıyor", "message": "YAZ2026 kodunu giriyorum ama indirim uygulanmiyor.", "status": "resolved", "priority": "normal", "admin_response": "Kod guncellendi, tekrar deneyin."},
]

TRANSFER_DATA = [
    {"from_depot_id": 1, "to_depot_id": 3, "cargo_count": 45, "status": "completed", "notes": "Istanbul-Ankara sabah seferi"},
    {"from_depot_id": 3, "to_depot_id": 4, "cargo_count": 28, "status": "completed", "notes": "Ankara-Izmir transfer"},
    {"from_depot_id": 2, "to_depot_id": 5, "cargo_count": 33, "status": "in_transit", "notes": "Istanbul-Bursa gece seferi"},
    {"from_depot_id": 4, "to_depot_id": 6, "cargo_count": 17, "status": "completed", "notes": "Izmir-Antalya"},
    {"from_depot_id": 1, "to_depot_id": 7, "cargo_count": 52, "status": "pending", "notes": "Istanbul-Gaziantep planlandı"},
    {"from_depot_id": 5, "to_depot_id": 8, "cargo_count": 21, "status": "completed", "notes": "Bursa-Konya aktarma"},
    {"from_depot_id": 3, "to_depot_id": 9, "cargo_count": 14, "status": "in_transit", "notes": "Ankara-Samsun transfer"},
    {"from_depot_id": 6, "to_depot_id": 10, "cargo_count": 19, "status": "completed", "notes": "Antalya-Kayseri"},
]

DEPOT_COORDS = {
    1: (40.9923, 29.1244), 2: (41.0195, 28.8897), 3: (39.9334, 32.8597),
    4: (38.4192, 27.1287), 5: (40.1826, 29.0665), 6: (36.8969, 30.7133),
    7: (37.0662, 37.3833), 8: (37.8667, 32.4833), 9: (41.2867, 36.3300),
    10: (38.7312, 35.4787),
}


def _gen_trf():
    return "TRF" + "".join(random.choices(string.digits, k=8))


def seed_additional_data():
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # 1. Incidents
        existing_incidents = db.query(Incident).count()
        if existing_incidents < 5:
            print("  -> Incidents ekleniyor...")
            for i, d in enumerate(INCIDENT_DATA):
                minutes_ago = random.randint(i * 30, i * 30 + 120)
                inc = Incident(
                    type=d["type"],
                    description=d["description"],
                    status=d["status"],
                    customer_id=1,
                    tracking_number=f"KRG{random.randint(1000000000, 9999999999)}",
                    created_at=now - timedelta(minutes=minutes_ago),
                )
                db.add(inc)
            db.commit()
            print(f"  OK {len(INCIDENT_DATA)} incident eklendi.")
        else:
            print(f"  OK Incidents zaten mevcut ({existing_incidents} kayit).")

        # 2. Support Tickets
        existing_support = db.query(SupportTicket).count()
        if existing_support < 5:
            print("  -> Support tickets ekleniyor...")
            for i, d in enumerate(SUPPORT_DATA):
                minutes_ago = random.randint(i * 60, i * 60 + 180)
                ticket = SupportTicket(
                    customer_id=1,
                    subject=d["subject"],
                    message=d["message"],
                    status=d["status"],
                    priority=d["priority"],
                    admin_response=d.get("admin_response"),
                    is_escalated=(d["priority"] == "critical"),
                    created_at=now - timedelta(minutes=minutes_ago),
                )
                db.add(ticket)
            db.commit()
            print(f"  OK {len(SUPPORT_DATA)} destek talebi eklendi.")
        else:
            print(f"  OK Support tickets zaten mevcut ({existing_support} kayit).")

        # 3. Transfers
        existing_transfers = db.query(Transfer).count()
        if existing_transfers == 0:
            print("  -> Transferler ekleniyor...")
            for i, d in enumerate(TRANSFER_DATA):
                days_ago = random.randint(0, 14)
                dep_time = now - timedelta(days=days_ago, hours=random.randint(0, 12))
                arr_time = dep_time + timedelta(hours=random.randint(4, 24)) if d["status"] == "completed" else None
                t = Transfer(
                    transfer_number=_gen_trf(),
                    from_depot_id=d["from_depot_id"],
                    to_depot_id=d["to_depot_id"],
                    cargo_count=d["cargo_count"],
                    status=d["status"],
                    notes=d["notes"],
                    departure_time=dep_time,
                    arrival_time=arr_time,
                    created_at=dep_time,
                )
                db.add(t)
            db.commit()
            print(f"  OK {len(TRANSFER_DATA)} transfer eklendi.")
        else:
            print(f"  OK Transfers zaten mevcut ({existing_transfers} kayit).")

        # 4. Inventory Logs
        existing_inv = db.query(InventoryLog).count()
        if existing_inv == 0:
            racks = db.query(WarehouseRack).all()
            if racks:
                print("  -> Inventory logs ekleniyor...")
                count = 0
                for rack in racks:
                    for j in range(random.randint(3, 8)):
                        action = random.choice(["in", "in", "out"])
                        log = InventoryLog(
                            depot_id=rack.depot_id,
                            rack_id=rack.id,
                            action=action,
                            note=f"{'Kargo kabul' if action == 'in' else 'Kargo sevk'} - {rack.code}",
                            created_by="admin",
                            created_at=now - timedelta(hours=random.randint(1, 72)),
                        )
                        db.add(log)
                        count += 1
                db.commit()
                print(f"  OK {count} inventory log eklendi.")
        else:
            print(f"  OK Inventory logs zaten mevcut ({existing_inv} kayit).")

        # 5. Campaigns
        existing_campaigns = db.query(Campaign).count()
        if existing_campaigns == 0:
            print("  -> Kampanyalar ekleniyor...")
            c1 = Campaign(
                name="Yaz Indirimi 2026",
                code="YAZ2026",
                discount_percentage=15.0,
                start_date=now - timedelta(days=5),
                end_date=now + timedelta(days=25),
                is_active=True,
            )
            c2 = Campaign(
                name="Kurumsal Destek",
                code="CORP10",
                discount_percentage=10.0,
                start_date=now - timedelta(days=30),
                end_date=now + timedelta(days=60),
                is_active=True,
            )
            db.add_all([c1, c2])
            db.commit()
            print("  OK 2 kampanya eklendi.")
        else:
            print(f"  OK Campaigns zaten mevcut ({existing_campaigns} kayit).")

        # 6. Courier GPS coords
        couriers_no_gps = db.query(Courier).filter(Courier.latitude == None).all()
        if couriers_no_gps:
            print(f"  -> {len(couriers_no_gps)} kurye GPS koordinati guncelleniyor...")
            for c in couriers_no_gps:
                base = DEPOT_COORDS.get(c.depot_id, (39.9334, 32.8597))
                c.latitude = round(base[0] + random.uniform(-0.05, 0.05), 5)
                c.longitude = round(base[1] + random.uniform(-0.05, 0.05), 5)
            db.commit()
            print("  OK Kurye GPS koordinatlari guncellendi.")
        else:
            print("  OK Kurye GPS koordinatlari zaten mevcut.")

    except Exception as e:
        print(f"  HATA: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_additional_data()
