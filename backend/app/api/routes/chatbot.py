from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.support import SupportTicket
from app.api.deps import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Akıllı Chatbot"])

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    intent: str
    reply: str
    requires_ticket: bool
    priority: str = "normal"

class EscalateRequest(BaseModel):
    message: str
    intent: str
    priority: str = "normal"


# Basit Intent Tespiti ve FAQ Motoru (Simülasyon)
def analyze_intent_and_reply(msg: str) -> dict:
    text = msg.lower()
    
    if "kırık" in text or "hasarlı" in text or "ezilmiş" in text:
        return {
            "intent": "damaged_package",
            "reply": "Kargonuzun hasarlı ulaşmasına çok üzüldük. Hasar tespiti için kurye ayrılmadan tutanak tutturmanız gerekmektedir. Eğer kurye ayrıldıysa, lütfen en kısa sürede fotoğraflarla birlikte destek talebi açın.",
            "requires_ticket": True,
            "priority": "high"
        }
    elif "kayıp" in text or "gelmedi" in text or "nerede" in text:
        return {
            "intent": "lost_or_delayed",
            "reply": "Kargonuzun nerede olduğunu öğrenmek için 'Kargo Takip' sayfamızı kullanabilirsiniz. Eğer kargonuzun kaybolduğunu düşünüyorsanız veya teslimat süresi çok geciktiyse, destek talebi oluşturabiliriz.",
            "requires_ticket": True,
            "priority": "high"
        }
    elif "adres" in text or "değişiklik" in text:
        return {
            "intent": "address_change",
            "reply": "Kargonuz henüz dağıtıma çıkmadıysa adres değişikliği yapabilirsiniz. Lütfen güncel adresinizi iletmek için bir destek talebi oluşturun.",
            "requires_ticket": True,
            "priority": "normal"
        }
    elif "iade" in text or "iptal" in text:
        return {
            "intent": "return_or_cancel",
            "reply": "İade işlemleri için 'Kargolarım' sekmesinden ilgili siparişi seçerek 'İade Et' butonuna tıklayabilirsiniz. Yardım isterseniz ticket açabilirsiniz.",
            "requires_ticket": False,
            "priority": "normal"
        }
    elif "ücret" in text or "fiyat" in text or "fatura" in text:
        return {
            "intent": "billing",
            "reply": "Fiyatlandırma ve faturalarla ilgili detayları Müşteri Panelinizdeki sipariş detaylarında bulabilirsiniz. Hatalı bir ücretlendirme olduğunu düşünüyorsanız lütfen bize bildirin.",
            "requires_ticket": True,
            "priority": "normal"
        }
    else:
        return {
            "intent": "general_support",
            "reply": "Size nasıl yardımcı olabileceğimi tam anlayamadım. İsterseniz konuyu detaylı inceleyebilmemiz için müşteri temsilcimize aktarayım ve bir destek talebi açalım.",
            "requires_ticket": True,
            "priority": "normal"
        }


@router.post("/message", response_model=ChatResponse)
def handle_message(payload: ChatMessage):
    """Kullanıcının mesajını analiz eder ve FAQ yanıtı döner."""
    result = analyze_intent_and_reply(payload.message)
    return ChatResponse(**result)


@router.post("/escalate")
def escalate_to_ticket(
    payload: EscalateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Chatbot çözemediğinde otomatik destek talebi açar."""
    subject_map = {
        "damaged_package": "Hasarlı Kargo Bildirimi",
        "lost_or_delayed": "Gecikmiş veya Kayıp Kargo",
        "address_change": "Adres Değişikliği Talebi",
        "return_or_cancel": "İade/İptal Talebi",
        "billing": "Fatura ve Ücretlendirme İtirazı",
        "general_support": "Genel Destek Talebi (Chatbot Yönlendirmesi)"
    }
    
    subject = subject_map.get(payload.intent, "Destek Talebi")
    
    ticket = SupportTicket(
        customer_id=current_user.id,
        subject=subject,
        message=f"[Chatbot'tan Aktarıldı]\n\nMüşteri Mesajı:\n{payload.message}",
        status="open",
        priority=payload.priority,
        intent=payload.intent,
        is_escalated=False
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    return {"status": "success", "ticket_id": ticket.id, "message": "Destek talebiniz başarıyla oluşturuldu."}
