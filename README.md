# KargoEnterprises

**Türkiye Kargo Bölge Optimizasyon ve Yönetim Sistemi**

Lojistik operasyonlarını merkezi bir platform üzerinden yönetmeye yönelik geliştirilmiş tam kapsamlı bir kurumsal kargo yönetim sistemidir. Sipariş takibi, rota optimizasyonu, depo yönetimi, kurye ve araç filosu takibi, müşteri paneli ve canlı harita görüntüleme gibi modülleri tek çatı altında sunar.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Proje Yapısı](#proje-yapısı)
- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Çalıştırma](#çalıştırma)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Modüller](#modüller)
- [Katkı Sağlama](#katkı-sağlama)
- [Lisans](#lisans)

---

## Özellikler

- **Sipariş Yönetimi** — Sipariş oluşturma, durum güncelleme, barkod/QR kod üretimi ve PDF faturalama
- **Rota Optimizasyonu** — scikit-learn ve XGBoost tabanlı algoritma ile teslimat güzergahlarının otomatik optimizasyonu
- **Canlı Kurye Takibi** — WebSocket üzerinden gerçek zamanlı konum güncellemeleri ve harita görüntüleme
- **Depo Yönetimi** — Raf, stok ve transfer işlemlerinin takibi
- **Araç ve Filo Yönetimi** — Araç bakım kayıtları, yakıt tüketimi ve atama yönetimi
- **Müşteri Paneli** — Müşterilere özel sipariş takip ve iletişim arayüzü
- **Kurumsal Müşteri Modülü** — Kurumsal hesap, sözleşme ve toplu sipariş yönetimi
- **Analitik ve Raporlama** — Recharts tabanlı gelişmiş grafikler ve performans göstergeleri
- **Hava Durumu Entegrasyonu** — Teslimat planlamasına etki eden hava koşullarının takibi
- **Destek ve Olay Yönetimi** — Müşteri talepleri ve lojistik olayların izlenmesi
- **Denetim Günlüğü** — Sistem genelinde tüm kritik işlemlerin kaydı
- **Rol Tabanlı Kimlik Doğrulama** — JWT ile güvenli giriş ve yetkilendirme sistemi

---

## Teknoloji Yığını

### Backend

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| Python | 3.11+ | Temel dil |
| FastAPI | 0.111.0 | REST API çatısı |
| Uvicorn | 0.30.1 | ASGI sunucusu |
| SQLAlchemy | 2.0.31 | ORM ve veritabanı yönetimi |
| Microsoft SQL Server | — | Ana veritabanı |
| pyodbc | 5.1.0 | MSSQL bağlantı sürücüsü |
| Alembic | 1.13.1 | Veritabanı migrasyon aracı |
| Pydantic | 2.7.4 | Veri doğrulama ve şema tanımı |
| scikit-learn | 1.5.0 | Rota optimizasyon algoritmaları |
| XGBoost | 2.0.3 | Tahminleme modelleri |
| NumPy / Pandas | 1.26 / 2.2 | Sayısal ve veri işleme |
| SciPy | 1.13.1 | İleri düzey matematiksel hesaplamalar |
| python-jose | 3.3.0 | JWT token yönetimi |
| passlib[bcrypt] | 1.7.4 | Şifre hashleme |
| ReportLab | 4.2.0 | PDF üretimi |
| python-barcode / qrcode | — | Barkod ve QR kod üretimi |
| **redis[asyncio]** | **5.x** | **Cache ve rate limiting (Memurai / Redis)** |

### Frontend

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| React | 19.x | Kullanıcı arayüzü |
| TypeScript | 6.x | Tip güvenli geliştirme |
| Vite | 8.x | Geliştirme sunucusu ve bundler |
| React Router DOM | 7.x | İstemci taraflı yönlendirme |
| Zustand | 5.x | Global durum yönetimi |
| Axios | 1.x | HTTP istemcisi |
| Leaflet / React-Leaflet | 1.9 / 5.x | İnteraktif harita görüntüleme |
| Leaflet.heat | 0.2.x | Isı haritası katmanı |
| Chart.js / Recharts | 4.x / 3.x | Grafik ve analitik bileşenleri |
| Lucide React | 1.x | İkon kütüphanesi |
| date-fns | 4.x | Tarih ve saat işlemleri |

---

## Proje Yapısı

```
KargoEnterprises/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/          # Tüm API endpoint'leri (22 modül)
│   │   │   └── websockets.py    # WebSocket canlı takip
│   │   ├── core/
│   │   │   ├── config.py        # Uygulama ayarları ve env yönetimi
│   │   │   ├── database.py      # Veritabanı bağlantısı
│   │   │   ├── redis_client.py  # Async Redis/Memurai singleton istemcisi
│   │   │   ├── rate_limiter.py  # Sliding window rate limiter
│   │   │   ├── security.py      # JWT ve bcrypt şifre yönetimi
│   │   │   └── audit_middleware.py  # İstek denetim middleware'i
│   │   ├── models/              # SQLAlchemy ORM modelleri
│   │   ├── schemas/             # Pydantic şemaları
│   │   ├── services/            # İş mantığı katmanı
│   │   ├── data/                # Statik/seed veri
│   │   └── main.py              # Uygulama giriş noktası
│   ├── requirements.txt
│   └── .env                     # Ortam değişkenleri (git'e dahil edilmez)
├── frontend/
│   ├── src/
│   │   ├── pages/               # Sayfa bileşenleri
│   │   ├── components/          # Paylaşılan UI bileşenleri
│   │   ├── store/
│   │   │   └── authStore.ts     # Zustand auth state (retry mekanizmalı)
│   │   └── services/
│   │       └── api.ts           # Axios istemcisi ve tüm API fonksiyonları
│   ├── public/                  # Statik dosyalar
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── start.bat                    # Windows için tek tıkla başlatma betiği
├── package.json                 # Eş zamanlı çalıştırma yapılandırması
└── README.md
```

---

## Gereksinimler

Kurulum öncesinde aşağıdaki araçların sisteminizde kurulu olduğundan emin olun:

- **Python** 3.11 veya üzeri
- **Node.js** 18 veya üzeri
- **npm** 9 veya üzeri
- **Microsoft SQL Server** (Express sürümü yeterlidir)
- **ODBC Driver 18 for SQL Server** ([İndirme bağlantısı](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server))
- **Memurai** (Windows için önerilen Redis uyumlu sunucu) veya **Redis** 6+ ([Memurai İndirme](https://www.memurai.com/))

> **Not:** Redis / Memurai isteğe bağlıdır. Kurulu değilse uygulama cache ve rate limiting olmadan çalışmaya devam eder. Ancak performans ve API koruma için kurulması **önerilir**.

---

## Kurulum

### 1. Repoyu klonlayın

```bash
git clone https://github.com/kullanici-adi/KargoEnterprises.git
cd KargoEnterprises
```

### 2. Python sanal ortamı oluşturun ve bağımlılıkları yükleyin

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 3. Frontend bağımlılıklarını yükleyin

```bash
cd frontend
npm install
cd ..
```

### 4. Kök dizin geliştirici bağımlılıklarını yükleyin

```bash
npm install
```

### 5. Veritabanını hazırlayın

SQL Server Management Studio (SSMS) veya `sqlcmd` aracıyla yeni bir veritabanı oluşturun:

```sql
CREATE DATABASE KargoEnterprise;
```

Uygulama ilk başlatıldığında SQLAlchemy tabloları otomatik olarak oluşturacaktır.

---

## Ortam Değişkenleri

`backend/` dizini içinde `.env` dosyası oluşturun. Aşağıdaki şablon üzerinden kendi değerlerinizi girin:

```env
# Veritabanı
DB_SERVER=localhost
DB_NAME=KargoEnterprise
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_TRUSTED_CONNECTION=yes

# Güvenlik
SECRET_KEY=guclu-ve-rastgele-bir-anahtar-buraya
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Uygulama
DEBUG=True

# Redis / Memurai (isteğe bağlı — kapatmak için REDIS_ENABLED=false)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
REDIS_AI_CACHE_TTL=3600        # AI yanıt cache süresi (saniye)
REDIS_ANALYTICS_CACHE_TTL=60   # Dashboard cache süresi (saniye)
REDIS_AI_RATE_LIMIT=20         # AI endpoint dakikada max istek
REDIS_CHAT_RATE_LIMIT=30       # Chatbot dakikada max istek
```

> **Uyarı:** `SECRET_KEY` değerini üretim ortamında mutlaka güçlü ve rastgele bir değerle değiştirin. Bu dosyayı asla git'e dahil etmeyin.

> **Redis:** Memurai / Redis kurulu değilse `REDIS_ENABLED=false` yaparak devre dışı bırakabilirsiniz. Sistem cache ve rate limiting olmadan çalışmaya devam eder.

---

## Çalıştırma

### Yöntem 1 — Windows: Tek Tıkla Başlatma

Proje kök dizinindeki `start.bat` dosyasını çalıştırın. Backend ve frontend ayrı terminal pencerelerinde otomatik olarak başlatılır.

```
start.bat
```

### Yöntem 2 — npm ile Eş Zamanlı Çalıştırma

```bash
npm start
```

### Yöntem 3 — Ayrı Ayrı Başlatma

**Backend:**

```bash
# Sanal ortamı etkinleştirin
venv\Scripts\activate

cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm run dev
```

### Erişim Adresleri

| Servis | Adres |
|---|---|
| Frontend Uygulaması | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger Dokümantasyonu | http://localhost:8000/docs |
| ReDoc Dokümantasyonu | http://localhost:8000/redoc |
| Sağlık Kontrolü | http://localhost:8000/health |

---

## API Dokümantasyonu

Uygulama çalışır durumdayken tüm endpoint'leri interaktif olarak test etmek için Swagger arayüzünü kullanabilirsiniz:

```
http://localhost:8000/docs
```

### Mevcut API Modülleri

| Prefix | Açıklama |
|---|---|
| `/api/auth` | Kimlik doğrulama, token alma |
| `/api/orders` | Sipariş CRUD, durum güncelleme |
| `/api/couriers` | Kurye yönetimi |
| `/api/vehicles` | Araç yönetimi |
| `/api/depots` | Depo yönetimi |
| `/api/warehouse` | Depo içi stok ve raf işlemleri |
| `/api/optimize` | Rota optimizasyon motoru |
| `/api/analytics` | Raporlar ve istatistikler |
| `/api/customers` | Müşteri yönetimi |
| `/api/customer-panel` | Müşteri self-servis paneli |
| `/api/corporate` | Kurumsal hesap yönetimi |
| `/api/fleet` | Filo ve bakım yönetimi |
| `/api/tariffs` | Tarife yönetimi |
| `/api/incidents` | Olay yönetimi |
| `/api/support` | Destek talepleri |
| `/api/chatbot` | Dahili chatbot endpoint'i |
| `/api/live-tracking` | Gerçek zamanlı konum API |
| `/api/weather` | Hava durumu servisi |
| `/api/audit-log` | Denetim günlüğü |
| `/api/locations` | Konum tanımları |

### WebSocket

Canlı kurye takibi için WebSocket bağlantısı:

```
ws://localhost:8000/api/ws/live-tracking
```

---

## Modüller

### Rota Optimizasyonu

Teslimat noktaları, araç kapasiteleri ve zaman pencereleri baz alınarak en verimli rotayı hesaplar. scikit-learn ve XGBoost tabanlı modeller ile geçmiş verilerden öğrenme desteği mevcuttur.

### Canlı Takip

WebSocket protokolü üzerinden kuryelerin gerçek zamanlı konumlarını Leaflet haritasında gösterir. Isı haritası katmanı ile yoğunluk analizi yapılabilir.

### Barkod ve QR Kod

Her sipariş için benzersiz barkod ve QR kod üretilir. PDF fatura ile birlikte dışa aktarılabilir.

### Kimlik Doğrulama

JWT tabanlı kimlik doğrulama ile rol bazlı erişim kontrolü uygulanmaktadır. Token süresi yapılandırılabilir. Logout işleminde token Redis blacklist'ine alınır ve kalan ömrü boyunca geçersiz sayılır.

### Cache ve Rate Limiting (Redis / Memurai)

`redis.asyncio` tabanlı async singleton istemcisi üzerinden çalışır. AI endpoint'leri ve chatbot için sliding window rate limiting uygulanır. Analitik dashboard ve AI yanıtları Redis'te TTL ile cache'lenir. Redis / Memurai çalışmıyorsa sistem **graceful fallback** ile cache ve rate limiting olmadan çalışmaya devam eder — hiçbir özellik devre dışı kalmaz.

- `_connection_failed` flag mekanizması ile başarısız bağlantı her API isteğinde tekrar denenmez, gereksiz timeout beklenmez.
- `health_check_interval=30` ile bağlantı sağlığı otomatik kontrol edilir.
- Retry mekanizması (`ExponentialBackoff`) ile geçici bağlantı kopmaları otomatik toparlanır.

### Hata Dayanıklı Giriş (Auth Race Condition Çözümü)

Uygulama ilk açıldığında backend henüz hazır olmayabilir (özellikle `start.bat` ile açılışta). Bu durum klasik bir race condition'a yol açıyordu: `initAuth()` backend'e bağlanamayınca token'ı localStorage'dan siliyordu ve kullanıcı doğru bilgilerini girmesine rağmen giriş yapamıyordu.

Yeni davranış:
- `initAuth` backend hazır olana kadar **3 kez 1.2 saniye aralıkla** retry yapar.
- Yalnızca gerçek `401 Unauthorized` yanıtında token silinir; ağ hatası veya `502/503` durumunda token korunur.
- Login formu da ağ hatalarında otomatik **3 deneme** yapar; hata mesajları ağ sorunu ile yanlış şifre arasında ayrıştırılır.

### OpenRouter API Key Havuzu — Otomatik Failover

AI destek chatbotu, OpenRouter API'ye erişmek için **3 API key'den oluşan bir havuz** kullanır. Bu sistem sayesinde bir key'in kotası veya rate limiti dolduğunda kullanıcı hiçbir şey fark etmeden konuşmaya devam edebilir.

**Çalışma Akışı:**

```
Birincil Key (1. key)
    │
    ├─ HTTP 429 (Rate Limit) veya 402 (Quota Bitti) alırsa
    │   └─► Otomatik → Yedek Key 1 devreye girer
    │           │
    │           ├─ O da 429/402 alırsa
    │           │   └─► Otomatik → Yedek Key 2 devreye girer
    │           │
    │           └─ Başarılı → Yanıt üretilir ✅
    │
    └─ Başarılı → Yanıt üretilir ✅
```

**Özellikler:**
- **Seamless geçiş** — Kullanıcı chatbot'ta konuşurken geçişi fark etmez; yedek key aynı istek içinde denenir ve yanıt üretilir.
- **Kalıcı hafıza** — Key bir kez değişince uygulama yeniden başlayana kadar o key'de kalır, gereksiz tekrar deneme olmaz.
- **Log kaydı** — Hangi key'in devreye girdiği ve HTTP hata kodu sunucu loglarına yazılır (`[API KEY ROTATE]` prefix'i ile).
- **Graceful fallback** — 3 key de tükenirse AI yanıtı yerine bilgi bankasından (RAG) bulunan ilgili belgeler kullanıcıya gösterilir; chatbot tamamen suskunlaşmaz.
- **Timeout ayrımı** — Ağ zaman aşımı hataları key rotasyonunu tetiklemez; yalnızca kota/rate-limit HTTP kodları (429, 402) geçişi başlatır.

> **Key eklemek / değiştirmek için:** `backend/app/services/ai_support.py` dosyasındaki `_API_KEYS` listesini düzenleyin. Sıralama önemlidir — ilk key birincil, kalanlar sırasıyla yedek olarak kullanılır.

---

### Denetim Günlüğü

Middleware katmanında çalışan denetim sistemi, tüm yazma işlemlerini (POST, PUT, DELETE) kullanıcı bilgisiyle birlikte kaydeder.

---

## Katkı Sağlama

1. Bu repoyu fork'layın
2. Yeni bir dal oluşturun: `git checkout -b ozellik/yeni-modul`
3. Değişikliklerinizi commit'leyin: `git commit -m "feat: yeni modül eklendi"`
4. Dalınızı push'layın: `git push origin ozellik/yeni-modul`
5. Pull Request açın

Commit mesajlarında [Conventional Commits](https://www.conventionalcommits.org/tr/) standardına uyulması önerilir.

---

## Lisans

Bu proje [MIT Lisansı](LICENSE) altında dağıtılmaktadır.
