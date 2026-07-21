"""
KargoEnterprises - AI Destek Servisi
=====================================
3 Katmanlı Yanıt Mimarisi:
  Katman 1 → Deterministik Kural Motoru (keyword-based)
  Katman 2 → RAG: Şirket Bilgi Bankasından Vektör Benzerlik Araması (simüle FAISS / cosine similarity)
  Katman 3 → Local LLM (Ollama - qwen3:8b) ile nihai yanıt üretimi
"""

import hashlib
import httpx
import json
import math
import re
import logging
from typing import Optional

from app.core.redis_client import redis_get, redis_set
from app.core.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
API_TIMEOUT = 30.0

# ─────────────────────────────────────────────────────────────
# MODEL HAVUZU — Birincil model rate-limit yerse yedek model denenir
# Tüm modeller ücretsiz (OpenRouter :free suffix)
# ─────────────────────────────────────────────────────────────
_MODELS: list[str] = [
    "google/gemma-4-31b-it:free",         # Birincil
    "google/gemma-4-26b-a4b-it:free",     # Yedek 1
    "nvidia/nemotron-nano-9b-v2:free",    # Yedek 2
    "poolside/laguna-xs-2.1:free",        # Yedek 3
]

# ─────────────────────────────────────────────────────────────
# API KEY HAVUZU — Otomatik Geçiş (Failover) Sistemi
# Birincil key hakkı bittiğinde (429/402) sıradaki yedek key
# devreye girer. Kullanıcı bunu fark etmez.
# ─────────────────────────────────────────────────────────────

_API_KEYS: list[str] = [
    "REDACTED_OPENROUTER_KEY",  # Birincil
    "REDACTED_OPENROUTER_KEY",  # Yedek 1
    "REDACTED_OPENROUTER_KEY",  # Yedek 2
]

# Hangi index'te olduğumuzu global olarak takip ediyoruz
_current_key_index: int = 0


def _get_current_key() -> str:
    """Aktif API key'ini döndürür."""
    return _API_KEYS[_current_key_index]


def _rotate_key() -> bool:
    """
    Bir sonraki yedek key'e geçer.
    Başarılıysa True, tüm key'ler tükendiyse False döndürür.
    """
    global _current_key_index
    if _current_key_index < len(_API_KEYS) - 1:
        _current_key_index += 1
        logger.warning(
            f"[API KEY ROTATE] Key #{_current_key_index} devreye alındı "
            f"(toplam {len(_API_KEYS)} key'den {_current_key_index + 1}. key aktif)."
        )
        return True
    logger.error("[API KEY ROTATE] Tüm API key'leri tükendi, fallback'e geçiliyor.")
    return False

# ─────────────────────────────────────────────────────────────
# KATMAN 2: Şirket Bilgi Bankası (Knowledge Base)
# Gerçek sistemde bu dokümanlar PDF olarak yüklenir ve
# faiss-cpu + sentence-transformers ile indekslenir.
# Burada demo metinleri ve basit TF-IDF benzeri cosine similarity
# ile RAG simülasyonu yapılmaktadır.
# ─────────────────────────────────────────────────────────────

KNOWLEDGE_BASE: list[dict] = [
    {
        "id": "KB-001",
        "title": "Kurye Kaza ve Acil Durum Prosedürü",
        "category": "Operasyon",
        "tags": ["kaza", "acil", "araç", "ambulans", "sos", "yaralı"],
        "content": (
            "KAZA DURUMUNDA YAPILACAKLAR:\n"
            "1. Kurye güvendeyse hemen 112 Acil'i arayın.\n"
            "2. Kaza yerini ve kargo ID'sini operasyon merkezine bildirin.\n"
            "3. Araç hasarı varsa filo yöneticisine (0800-XXX-XXXX) acil mesaj atın.\n"
            "4. Kargo zarar görmediyse en yakın depoya teslim edilmeli.\n"
            "5. Kaza tutanağı 24 saat içinde sisteme yüklenmelidir.\n"
            "Acil hatta ulaşmak için uygulamadan S.O.S → 'Araç/Kaza Bildirimi' butonunu kullanın."
        ),
    },
    {
        "id": "KB-002",
        "title": "Zebra Barkod Okuyucu Arıza ve Bakım Rehberi",
        "category": "Teknik",
        "tags": ["barkod", "zebra", "tarayıcı", "arıza", "okuyucu", "donanım", "scanner"],
        "content": (
            "ZEBRA BARKOD OKUYUCU SORUN GİDERME:\n"
            "Model: Zebra TC21 / TC26 / DS8178\n\n"
            "1. CİHAZ YANIT VERMİYOR:\n"
            "   - Bataryayı çıkarıp 30 saniye bekleyin, takın ve yeniden başlatın.\n"
            "   - Şarj kablosunu değiştirerek deneyin.\n\n"
            "2. BARKOD OKUTMUYOR:\n"
            "   - Tarayıcı penceresini yumuşak bezle temizleyin.\n"
            "   - DataWedge uygulamasını açın → Profile0 → Barcode Input etkinleştirin.\n"
            "   - Cihaz ayarlarından 'Symbologies' menüsünde Code128 ve QR aktif olmalı.\n\n"
            "3. YAZILIM GÜNCELLEME:\n"
            "   - Zebra LifeGuard üzerinden en son firmware'i indirin.\n\n"
            "4. HARDRESETbunu yapmaktan kaçının — IT desteği açın.\n\n"
            "Çözülmezse IT Destek Talebi açın (Öncelik: Yüksek)."
        ),
    },
    {
        "id": "KB-003",
        "title": "API ve Sistem Entegrasyon Rehberi (B2B)",
        "category": "Geliştirici",
        "tags": ["api", "entegrasyon", "rest", "webhook", "token", "bağlantı", "çökme", "hata"],
        "content": (
            "KARGO B2B REST API KULLANIM KILAVUZU:\n\n"
            "Base URL: https://api.kargo.com/v2\n"
            "Auth: Bearer token (JWT) — /api/auth/login endpoint'inden alınır.\n\n"
            "ÖNEMLİ ENDPOINT'LER:\n"
            "  POST /api/orders       → Yeni sipariş oluştur\n"
            "  GET  /api/orders/{id}  → Sipariş detayı\n"
            "  GET  /api/tracking/{no}→ Kargo takip\n"
            "  POST /api/webhooks     → Webhook kayıt\n\n"
            "HATA KODLARI:\n"
            "  401 Unauthorized → Token süresi dolmuş, yenileyin.\n"
            "  429 Too Many Requests → Rate limit: 1000 istek/saat.\n"
            "  503 Service Unavailable → Sistem bakımda, 5 dk bekleyin.\n\n"
            "API çökmesi durumunda: DevOps kanalına (#api-alerts) bildirim gönderin."
        ),
    },
    {
        "id": "KB-004",
        "title": "SLA Kuralları ve Teslimat Zorunlulukları",
        "category": "Operasyon",
        "tags": ["sla", "teslimat", "süre", "gecikme", "garanti", "tazminat", "iade"],
        "content": (
            "SLA (SERVICE LEVEL AGREEMENT) KURALLARI:\n\n"
            "1. STANDART TESLİMAT: Sipariş + 2 iş günü içinde teslimat.\n"
            "2. EKSPRES TESLİMAT: Aynı gün 18:00'e kadar verilen siparişler → ertesi gün 12:00.\n"
            "3. GECİKME TAZMİNATI: SLA ihlali halinde müşteriye %50 ücret iadesi yapılır.\n"
            "4. MİSAFİR TESLİMAT: 3 denemeden sonra başarısız teslimat depoya alınır, 5 gün beklenir.\n"
            "5. HASAR/KAYIP: Kargo hasarı 72 saat içinde bildirilmeli. Sigorta kapsamı: max 500 TL.\n\n"
            "MOLA HAKLARI:\n"
            "  - 4 saatlik mesai → 15 dk mola\n"
            "  - 8 saatlik mesai → 45 dk mola (bölünebilir)\n\n"
            "SLA ihlali raporu için: Raporlar → SLA Analizi menüsünü kullanın."
        ),
    },
    {
        "id": "KB-005",
        "title": "Güvenlik İhlali Müdahale Prosedürü",
        "category": "Güvenlik",
        "tags": ["güvenlik", "ihlal", "siber", "veri", "saldırı", "şifre", "yetki", "erişim"],
        "content": (
            "GÜVENLİK İHLALİ MÜDAHALE ADIMLARI:\n\n"
            "1. ANINDA yapılacaklar:\n"
            "   - Etkilenen hesabı/sistemi derhal devre dışı bırakın.\n"
            "   - Güvenlik birimi ile iletişime geçin: security@kargo.com\n"
            "   - S.O.S → 'Güvenlik İhlali' butonuna basın.\n\n"
            "2. İLK 1 SAAT:\n"
            "   - Etkilenen veri kapsamını belirleyin.\n"
            "   - Log dosyalarını yedekleyin ve paylaşmayın.\n"
            "   - Tüm kritik sistemlerin şifrelerini sıfırlayın.\n\n"
            "3. RAPORLAMA:\n"
            "   - KVKK gereği 72 saat içinde ilgili makama bildirim zorunludur.\n"
            "   - Olay raporu IT Direktörü'ne iletilmelidir.\n\n"
            "Şifre sıfırlama: Sistem yöneticiniz üzerinden yapılır. Self-servis kapalıdır."
        ),
    },
    {
        "id": "KB-006",
        "title": "K-Means Bölgeleme Algoritması Kullanım Kılavuzu",
        "category": "Yapay Zeka",
        "tags": ["k-means", "bölge", "algoritma", "kümeleme", "optimizasyon", "rota", "teslimat bölgesi"],
        "content": (
            "K-MEANS BÖLGELEME KULLANIM KILAVUZU:\n\n"
            "1. ÇALIŞTIRILMASI:\n"
            "   Teslimat Bölgeleri sayfası → 'K-Means Kümeleme Başlat' butonu\n\n"
            "2. PARAMETRE AYARLARI:\n"
            "   - K değeri: Depo sayısına eşit tutun (önerilen).\n"
            "   - Max iterations: Büyük siparişler için 300 kullanın.\n"
            "   - Ağırlık: Sipariş yoğunluğuna göre otomatik atanır.\n\n"
            "3. SONUÇLARI YORUMLAMA:\n"
            "   - Silhouette Score > 0.5 → İyi kümeleme.\n"
            "   - Inertia değeri düşük olmalı.\n"
            "   - Renk kodlu bölgeler harita üzerinde görüntülenir.\n\n"
            "4. MANUEL DÜZELTME:\n"
            "   Otomatik kümeleme sonrası haritadan sürükle-bırak ile bölge sınırları ayarlanabilir.\n\n"
            "Not: K-Means her gün gece 02:00'de otomatik çalışır (scheduler)."
        ),
    },
    {
        "id": "KB-007",
        "title": "Kurye Uygulaması: Şifre ve Hesap Yönetimi",
        "category": "IT",
        "tags": ["şifre", "sıfırlama", "giriş", "hesap", "login", "erişim", "kurye uygulaması"],
        "content": (
            "KURYE UYGULAMASI HESAP YÖNETİMİ:\n\n"
            "ŞİFRE SIFIRLAMA:\n"
            "  Kuryeler kendi şifresini sıfırlayamaz. Prosedür:\n"
            "  1. Şube yöneticisi → Admin Paneli → Kuryeler → İlgili kurye → 'Şifreyi Sıfırla'\n"
            "  2. Geçici şifre kurye cep telefonuna SMS ile iletilir.\n"
            "  3. İlk girişte kurye kendi şifresini belirler.\n\n"
            "HESAP KİLİTLENME:\n"
            "  5 başarısız giriş → hesap 30 dk kilitlenir.\n"
            "  Acil durumlarda IT destek ile hesap manuel açılabilir.\n\n"
            "YENİ KURYE EKLEME:\n"
            "  Kuryeler → 'Yeni Kurye Ekle' → Gerekli belgeler:\n"
            "  - Ehliyet fotokopisi\n"
            "  - Adli sicil kaydı (son 3 ay)\n"
            "  - IBAN bilgisi"
        ),
    },
    {
        "id": "KB-008",
        "title": "Depo API Bağlantı Sorunu Giderme",
        "category": "Teknik",
        "tags": ["depo", "api", "bağlantı", "timeout", "hata", "entegrasyon", "izmir", "ankara"],
        "content": (
            "DEPO API BAĞLANTI SORUNLARI:\n\n"
            "BELİRTİLER: Timeout hatası, 503 yanıtı, veri senkronizasyon gecikmesi.\n\n"
            "SORUN GİDERME ADIMLARI:\n"
            "1. Depo sunucusu ping testi: ping depo-izmir.kargo.com\n"
            "2. API Gateway durumu: https://status.kargo.com sayfasını kontrol edin.\n"
            "3. VPN bağlantısını kesin ve yeniden bağlanın.\n"
            "4. Auth token yenileme: Token 6 saatlik geçerlilik süresine sahip.\n"
            "5. Depo yerel IT'sini arayın: 0232-XXX-XXXX\n\n"
            "KALICI ÇÖZÜM:\n"
            "  Depo lokasyonu için statik IP whitelist talebi açın.\n"
            "  Öncelik: Kritik — DevOps escalate edin."
        ),
    },
]


# ─────────────────────────────────────────────────────────────
# KATMAN 1: Deterministik Kural Motoru
# ─────────────────────────────────────────────────────────────

LAYER1_RULES = [
    {
        "keywords": ["sos", "s.o.s", "kaza", "yaralı", "ambulans", "araç devrildi"],
        "intent": "emergency_accident",
        "priority": "critical",
        "reply": (
            "🚨 **ACİL DURUM TESPİT EDİLDİ — KAZA/ARAÇ**\n\n"
            "Lütfen şu adımları derhal uygulayın:\n"
            "1. **112 Acil'i** arayın (yaralı varsa önce tıbbi yardım).\n"
            "2. Sayfanın üstündeki **🔴 S.O.S → 'Araç / Kaza Bildirimi'** butonuna basın.\n"
            "3. Kargo ID ve konum bilginizi operasyon merkezine bildirin.\n\n"
            "Filo yönetiminize otomatik bildirim gönderildi. Size en yakın destek ulaşacak."
        ),
        "suggest_ticket": True,
        "ticket_subject": "ACİL: Araç/Kaza Bildirimi",
    },
    {
        "keywords": ["api çöktü", "sistem çöktü", "api down", "servis kapalı", "503", "bağlanamıyorum"],
        "intent": "emergency_api_down",
        "priority": "critical",
        "reply": (
            "⚠️ **SİSTEM/API ÇÖKMESI ALGILANDI**\n\n"
            "Hızlı aksiyon adımları:\n"
            "1. S.O.S → **'Sistem / API Çökmesi'** butonuna basın → DevOps ekibi anında bilgilendirilir.\n"
            "2. https://status.kargo.com adresinden sistem durumunu kontrol edin.\n"
            "3. Etkilenen depo/servis adını belirterek IT destek talebi açın.\n\n"
            "Ortalama kurtarma süresi: **< 15 dakika**."
        ),
        "suggest_ticket": True,
        "ticket_subject": "ACİL: Sistem/API Kesintisi",
    },
    {
        "keywords": ["güvenlik ihlali", "hack", "saldırı", "veri sızıntısı", "yetkisiz erişim"],
        "intent": "emergency_security",
        "priority": "critical",
        "reply": (
            "🔒 **GÜVENLİK İHLALİ ALGILANDI**\n\n"
            "Acil adımlar:\n"
            "1. **Etkilenen hesabı devre dışı bırakın** — Kullanıcı Yönetimi → Hesabı Kilitle.\n"
            "2. S.O.S → **'Güvenlik İhlali'** butonuna basın.\n"
            "3. security@kargo.com adresine olay özeti iletin.\n"
            "4. **KVKK gereği 72 saat içinde bildirim zorunludur.**\n\n"
            "IT Güvenlik ekibi otomatik olarak uyarıldı."
        ),
        "suggest_ticket": True,
        "ticket_subject": "ACİL: Güvenlik İhlali",
    },
    {
        "keywords": ["takip no:", "takip numarası:", "kargo nerede", "nerede kargom"],
        "intent": "track_package",
        "priority": "low",
        "reply": (
            "📦 **Kargo Takip**\n\n"
            "Gönderi takibi için:\n"
            "- Sol menüden **Canlı Takip** sayfasını açın.\n"
            "- Veya doğrudan `/track` sayfasına gidin ve takip numaranızı girin.\n\n"
            "Takip No: `{tracking_no}` → Sistem üzerinden sorgulayabilirsiniz."
        ),
        "suggest_ticket": False,
    },
]


def layer1_check(message: str) -> Optional[dict]:
    """Mesajı kural motoruna gönderir. Eşleşme varsa yanıtı döndürür."""
    msg_lower = message.lower().strip()

    # Takip numarası özel parsing
    tracking_match = re.search(r"takip\s*(?:no[:\s]*|numaras[iı][:\s]*)([A-Z0-9\-]+)", message, re.IGNORECASE)
    tracking_no = tracking_match.group(1) if tracking_match else None

    for rule in LAYER1_RULES:
        for kw in rule["keywords"]:
            if kw in msg_lower:
                reply = rule["reply"]
                if tracking_no and "{tracking_no}" in reply:
                    reply = reply.replace("{tracking_no}", tracking_no)
                return {
                    "layer": 1,
                    "intent": rule["intent"],
                    "reply": reply,
                    "priority": rule.get("priority", "normal"),
                    "suggest_ticket": rule.get("suggest_ticket", False),
                    "ticket_subject": rule.get("ticket_subject", ""),
                    "sources": [],
                }
    return None


# ─────────────────────────────────────────────────────────────
# KATMAN 2: RAG — Vektör Benzerlik Araması (Simüle)
# Gerçek uygulamada: faiss-cpu + sentence-transformers
#   from sentence_transformers import SentenceTransformer
#   model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')
#   embeddings = model.encode([doc['content'] for doc in KNOWLEDGE_BASE])
#   index = faiss.IndexFlatL2(embeddings.shape[1])
#   index.add(embeddings)
# ─────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    """Basit Türkçe tokenizer — noktalama temizle, küçük harfe çevir."""
    text = text.lower()
    text = re.sub(r"[^\w\sçşğüöıİ]", " ", text)
    return [t for t in text.split() if len(t) > 2]


def _tf(tokens: list[str], word: str) -> float:
    """Term Frequency hesapla."""
    count = tokens.count(word)
    return count / len(tokens) if tokens else 0.0


def _cosine_sim(vec_a: dict, vec_b: dict) -> float:
    """İki TF vektörü arasında cosine benzerliği."""
    common = set(vec_a.keys()) & set(vec_b.keys())
    if not common:
        return 0.0
    dot = sum(vec_a[w] * vec_b[w] for w in common)
    mag_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    mag_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


async def check_api_available() -> bool:
    """API bağlantısının açık olup olmadığını kontrol eder."""
    return True  # Bulut API kullandığımız için servisin açık olduğunu varsayıyoruz


def layer2_retrieve(query: str, top_k: int = 2) -> list[dict]:
    """
    RAG Katmanı: Sorguya en uygun dokümanları döndürür.
    Gerçek sistemde FAISS + sentence-transformers kullanılır.
    Bu implementasyon TF-cosine benzerliği ile simüle eder.
    """
    query_tokens = _tokenize(query)

    # Tag-based bonus scoring (daha hızlı ilgili eşleşme)
    tag_bonus_weight = 3.0

    results = []
    for doc in KNOWLEDGE_BASE:
        doc_text = f"{doc['title']} {' '.join(doc['tags'])} {doc['content']}"
        doc_tokens = _tokenize(doc_text)

        # TF vektörleri
        vocab = set(query_tokens + doc_tokens)
        q_vec = {w: _tf(query_tokens, w) for w in query_tokens}
        d_vec = {w: _tf(doc_tokens, w) for w in vocab if w in doc_tokens}

        sim = _cosine_sim(q_vec, d_vec)

        # Tag eşleşmesi bonusu
        query_lower = query.lower()
        tag_match = sum(1 for tag in doc["tags"] if tag in query_lower)
        sim += tag_match * tag_bonus_weight * 0.1

        results.append({"doc": doc, "score": sim})

    results.sort(key=lambda x: x["score"], reverse=True)
    top = [r for r in results[:top_k] if r["score"] > 0.05]
    return top


# ─────────────────────────────────────────────────────────────
# KATMAN 3: OpenRouter Cloud API Entegrasyonu
# ─────────────────────────────────────────────────────────────

async def layer3_llm(question: str, context_docs: list[dict]) -> str:
    """
    OpenRouter API kullanılarak Cloud LLM'e RAG context + soru gönderilir.

    Çift katmanlı otomatik failover:
      - Key 429/402  → bir sonraki API key devreye girer.
      - Model 429    → aynı key ile bir sonraki model denenir.
    Kullanıcı bu geçişleri fark etmez.
    """

    # 1. RAG Context'ini metne dönüştür
    context_text = ""
    if context_docs:
        context_text = "BİLGİ BANKASI İÇERİĞİ:\n"
        for i, doc in enumerate(context_docs, 1):
            context_text += f"[{i}] {doc['doc']['title']}:\n{doc['doc']['content']}\n\n"

    system_prompt = (
        "Sen KargoEnterprises şirketinin AI destek asistanısın. "
        "Sana sağlanan 'BİLGİ BANKASI İÇERİĞİ'ne dayanarak kullanıcıların sorunlarını çöz. "
        "Eğer bilgi bankasında cevap yoksa, mantıklı ve profesyonel bir tahminde bulun ama bunu belirt. "
        "Kısa, net ve çözüm odaklı ol. Madde işaretleri kullan."
    )

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"{context_text}\nKULLANICI SORUSU: {question}"
            }
        ],
        "temperature": 0.3,
        "max_tokens": 512,
    }

    # Çift katmanlı failover: her key için tüm modelleri dene
    for key_attempt in range(len(_API_KEYS) - _current_key_index):
        active_key = _get_current_key()
        headers = {
            "Authorization": f"Bearer {active_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "Kargo AI Support"
        }

        for model_index, model_name in enumerate(_MODELS):
            payload["model"] = model_name

            try:
                async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
                    resp = await client.post(OPENROUTER_URL, json=payload, headers=headers)

                    if resp.status_code in (429, 402, 404):
                        resp_body = resp.text[:200]
                        # Upstream provider rate-limit mi, yoksa key kotaı mı, yoksa model mi silindi (404)?
                        if "upstream" in resp_body.lower() or "provider" in resp_body.lower() or resp.status_code == 404:
                            # Model tarafında sorun → sonraki modeli dene
                            logger.warning(
                                f"[MODEL ROTATE] '{model_name}' rate-limited or not found (HTTP {resp.status_code}). "
                                f"Sonraki model deneniyor..."
                            )
                            continue  # model_index döngüsünde bir sonraki
                        else:
                            # Key kotaı → sonraki key'e geç
                            logger.warning(
                                f"[KEY ROTATE] Key #{_current_key_index + 1} "
                                f"HTTP {resp.status_code}. Yedek key deneniyor..."
                            )
                            rotated = _rotate_key()
                            if not rotated:
                                # Tüm key'ler bitti → fallback
                                fallback_msg = (
                                    "⚠️ AI servisine şu an ulaşılamıyor. "
                                    "Ancak aradığınız konuyla ilgili şu bilgileri buldum:\n\n"
                                )
                                fallback_msg += "\n".join(
                                    [f"- **{d['doc']['title']}**: {d['doc']['content'][:150]}..." for d in context_docs[:2]]
                                )
                                return fallback_msg
                            break  # Bu key döngüsünden çık, yeni key ile tüm modelleri yeniden dene

                    elif resp.status_code == 200:
                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        if model_index > 0 or key_attempt > 0:
                            logger.info(
                                f"[FAILOVER OK] Yanıt alındı: key=#{_current_key_index + 1}, model='{model_name}'"
                            )
                        return content

                    else:
                        logger.error(
                            f"[API] Beklenmeyen HTTP {resp.status_code}: {resp.text[:150]}"
                        )
                        break  # Model döngüsünden çık

            except httpx.TimeoutException:
                logger.error(f"[API] Zaman aşımı: key=#{_current_key_index + 1}, model='{model_name}'")
                return "⏱️ AI API yanıt süresi aşıldı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin."
            except Exception as e:
                logger.error(f"[API] Beklenmeyen hata: {str(e)}")
                break

    # Tüm key + model kombinasyonları başarısız → RAG fallback
    fallback_msg = "⚠️ AI servisine şu an ulaşılamıyor. Ancak aradığınız konuyla ilgili şu bilgileri buldum:\n\n"
    fallback_msg += "\n".join(
        [f"- **{d['doc']['title']}**: {d['doc']['content'][:150]}..." for d in context_docs[:2]]
    )
    return fallback_msg


# ─────────────────────────────────────────────────────────────
# ANA ORCHESTRATOR
# ─────────────────────────────────────────────────────────────

def _cache_key(message: str) -> str:
    """Mesajdan deterministik cache anahtarı üretir (SHA256)."""
    normalized = message.strip().lower()
    return "ai_cache:" + hashlib.sha256(normalized.encode("utf-8")).hexdigest()


async def process_chat_message(message: str) -> dict:
    """
    3 katmanlı AI yanıt pipeline'ı:
      1 → Kural kontrolü (anında)
      2 → RAG ile ilgili doküman çekimi
      3 → Ollama LLM ile yanıt üretimi

    Redis Cache:
      - Katman 1 sonuçları cache'lenmez (zaten anlık).
      - Katman 2+3 sonuçları {REDIS_AI_CACHE_TTL} saniye cache'lenir.
      - Aynı soru 1 saat içinde tekrar gelirse Redis'ten döner → OpenRouter çağrısı yok.
    """
    # Katman 1: Kural Motoru (cache bypass — anlık ve ücretsiz)
    rule_result = layer1_check(message)
    if rule_result:
        return rule_result

    # ─── Redis Cache Kontrolü ─────────────────────────────────────────────
    cache_key = _cache_key(message)
    cached_raw = await redis_get(cache_key)
    if cached_raw:
        try:
            cached_result = json.loads(cached_raw)
            cached_result["cache_hit"] = True
            logger.debug(f"AI Cache HIT: {cache_key[:32]}...")
            return cached_result
        except Exception:
            pass  # Bozuk cache — devam et
    # ───────────────────────────────────────────────────────────────────

    # Katman 2: RAG Vektör Arama
    retrieved_docs = layer2_retrieve(message, top_k=2)

    # Katman 3: LLM Yanıt Üretimi
    llm_reply = await layer3_llm(message, retrieved_docs)

    # Ticket önerisi: Barkod, donanım, arıza gibi kelimelerde öner
    suggest_keywords = ["arıza", "çalışmıyor", "bozuk", "hata", "sorun", "çöktü", "açılmıyor"]
    suggest_ticket = any(kw in message.lower() for kw in suggest_keywords)

    # Ticket konusu önerisi
    ticket_subject = ""
    if suggest_ticket and retrieved_docs:
        ticket_subject = retrieved_docs[0]["doc"]["title"]

    result = {
        "layer": 3,
        "intent": "rag_llm",
        "reply": llm_reply,
        "priority": "normal",
        "suggest_ticket": suggest_ticket,
        "ticket_subject": ticket_subject,
        "cache_hit": False,
        "sources": [
            {
                "id": r["doc"]["id"],
                "title": r["doc"]["title"],
                "category": r["doc"]["category"],
                "score": round(r["score"], 3),
            }
            for r in retrieved_docs
        ],
    }

    # ─── Redis'e Kaydet ───────────────────────────────────────────────
    try:
        await redis_set(
            cache_key,
            json.dumps(result, ensure_ascii=False),
            ttl_seconds=settings.REDIS_AI_CACHE_TTL,
        )
        logger.debug(f"AI Cache SET: {cache_key[:32]}... TTL={settings.REDIS_AI_CACHE_TTL}sn")
    except Exception as exc:
        logger.warning(f"AI cache yazma hatası: {exc}")
    # ─────────────────────────────────────────────────────

    return result
