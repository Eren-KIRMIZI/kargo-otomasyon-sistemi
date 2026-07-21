"""
Audit Log seed verisi — başlangıçta gerçekçi kayıtlar oluşturur.
"""
from datetime import datetime, timedelta
import random

SEED_LOGS = [
    # Kullanıcı işlemleri
    {"username": "admin",    "action": "LOGIN",  "module": "Sistem",    "detail": "Yönetici paneline giriş yapıldı"},
    {"username": "operator", "action": "LOGIN",  "module": "Sistem",    "detail": "Operatör paneline giriş yapıldı"},
    {"username": "admin",    "action": "CREATE", "module": "Kuryeler",  "detail": "Yeni kurye oluşturuldu: Ahmet Yılmaz"},
    {"username": "admin",    "action": "CREATE", "module": "Kuryeler",  "detail": "Yeni kurye oluşturuldu: Fatma Kaya"},
    {"username": "admin",    "action": "UPDATE", "module": "Siparişler","detail": "Sipariş #TRK-1832 durumu güncellendi: Beklemede → Dağıtımda"},
    {"username": "operator", "action": "ASSIGN", "module": "Siparişler","detail": "Sipariş #TRK-1832 kurye Ahmet Yılmaz'a atandı"},
    {"username": "admin",    "action": "UPDATE", "module": "Siparişler","detail": "Sipariş #TRK-1833 durumu güncellendi: Dağıtımda → Teslim Edildi"},
    {"username": "admin",    "action": "CREATE", "module": "Araçlar",   "detail": "Yeni araç eklendi: 34 ABC 123 (Motosiklet)"},
    {"username": "admin",    "action": "DELETE", "module": "Araçlar",   "detail": "Araç silindi: 34 XYZ 999 (Hasarlı araç)"},
    {"username": "admin",    "action": "UPDATE", "module": "Tarifeler", "detail": "Standart kargo tarifesi güncellendi: 12.50 TL → 14.00 TL"},
    {"username": "operator", "action": "ASSIGN", "module": "Siparişler","detail": "Sipariş #TRK-1890 kurye Mehmet Demir'e atandı"},
    {"username": "admin",    "action": "CREATE", "module": "Depolar",   "detail": "Yeni depo oluşturuldu: Kadıköy Şube"},
    {"username": "admin",    "action": "UPDATE", "module": "Bölgeler",  "detail": "Teslimat bölgesi güncellendi: Maltepe-Kartal arası genişletildi"},
    {"username": "admin",    "action": "CREATE", "module": "Siparişler","detail": "Yeni sipariş oluşturuldu: #TRK-1920"},
    {"username": "operator", "action": "UPDATE", "module": "Kuryeler",  "detail": "Kurye durumu güncellendi: Ali Şahin → Görevde"},
    {"username": "admin",    "action": "DELETE", "module": "Bölgeler",  "detail": "Eski bölge silindi: İzmit-Dilovası teslimat bölgesi"},
    {"username": "admin",    "action": "CREATE", "module": "Müşteriler","detail": "Yeni müşteri kaydedildi: Teknoloji A.Ş."},
    {"username": "operator", "action": "ASSIGN", "module": "Siparişler","detail": "Toplu atama: 12 sipariş Beşiktaş güzergahına atandı"},
    {"username": "admin",    "action": "UPDATE", "module": "Siparişler","detail": "Sipariş #TRK-1799 iade işlemi başlatıldı"},
    {"username": "admin",    "action": "LOGOUT", "module": "Sistem",    "detail": "Oturum kapatıldı"},
    {"username": "admin",    "action": "LOGIN",  "module": "Sistem",    "detail": "Yönetici paneline giriş yapıldı"},
    {"username": "admin",    "action": "CREATE", "module": "Raporlar",  "detail": "Aylık operasyon raporu oluşturuldu: Haziran 2026"},
    {"username": "operator", "action": "UPDATE", "module": "Siparişler","detail": "Sipariş #TRK-1905 durumu güncellendi: Teslim Edilemedi → Tekrar Denenecek"},
    {"username": "admin",    "action": "DELETE", "module": "Müşteriler","detail": "Pasif müşteri kaydı silindi: ID #245"},
    {"username": "operator", "action": "LOGIN",  "module": "Sistem",    "detail": "Operatör paneline giriş yapıldı"},
    {"username": "admin",    "action": "CREATE", "module": "Tarifeler", "detail": "Kurumsal müşteri özel tarifesi oluşturuldu"},
    {"username": "admin",    "action": "UPDATE", "module": "Depolar",   "detail": "Depo kapasitesi güncellendi: Üsküdar Şube 500 → 750 paket"},
]


def seed_audit_logs(db):
    from app.models.audit_log import AuditLog
    count = db.query(AuditLog).count()
    if count > 0:
        return  # Zaten seed edilmiş

    now = datetime.utcnow()
    ips = ["192.168.1.10", "192.168.1.11", "10.0.0.5", "10.0.0.8"]

    for i, entry in enumerate(SEED_LOGS):
        # Geriye doğru rastgele zamanlar — en yeni en üstte
        minutes_ago = random.randint(i * 10, i * 10 + 30)
        log = AuditLog(
            timestamp  = now - timedelta(minutes=minutes_ago),
            ip_address = random.choice(ips),
            **entry,
        )
        db.add(log)

    db.commit()
