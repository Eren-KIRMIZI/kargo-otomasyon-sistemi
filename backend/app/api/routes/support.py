from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.support import SupportTicket
from app.api.deps import get_current_user
from app.services.ai_support import process_chat_message, KNOWLEDGE_BASE

router = APIRouter(prefix="/support", tags=["Destek Merkezi"])


class TicketCreate(BaseModel):
    subject: str
    message: str

class TicketAdminUpdate(BaseModel):
    status: Optional[str] = None
    admin_response: Optional[str] = None
    priority: Optional[str] = None
    is_escalated: Optional[bool] = None

class TicketOut(BaseModel):
    id: int
    customer_id: int
    subject: str
    message: str
    status: str
    admin_response: Optional[str]
    priority: str
    intent: Optional[str]
    is_escalated: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


@router.get("", response_model=List[TicketOut])
def list_tickets(
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Admin: Tüm destek taleplerini listeler."""
    q = db.query(SupportTicket)
    if status:
        q = q.filter(SupportTicket.status == status)
    return q.order_by(SupportTicket.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/stats")
def ticket_stats(db: Session = Depends(get_db)):
    total = db.query(SupportTicket).count()
    open_ = db.query(SupportTicket).filter(SupportTicket.status == "open").count()
    answered = db.query(SupportTicket).filter(SupportTicket.status == "answered").count()
    resolved = db.query(SupportTicket).filter(SupportTicket.status == "resolved").count()
    return {"total": total, "open": open_, "answered": answered, "resolved": resolved}


@router.get("/my-tickets", response_model=List[TicketOut])
def my_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Müşteri kendi taleplerini görür."""
    return (
        db.query(SupportTicket)
        .filter(SupportTicket.customer_id == current_user.id)
        .order_by(SupportTicket.created_at.desc())
        .all()
    )


@router.post("/check-sla")
def check_sla(db: Session = Depends(get_db)):
    """Açık olan ve 24 saati geçmiş biletleri 'is_escalated=True' ve 'priority=critical' yapar."""
    now = datetime.utcnow()
    # 24 hours in seconds
    threshold = 24 * 3600
    
    open_tickets = db.query(SupportTicket).filter(SupportTicket.status == "open", SupportTicket.is_escalated == False).all()
    escalated_count = 0
    
    for ticket in open_tickets:
        diff = (now - ticket.created_at).total_seconds()
        if diff > threshold:
            ticket.is_escalated = True
            ticket.priority = "critical"
            escalated_count += 1
            
    if escalated_count > 0:
        db.commit()
        
    return {"status": "success", "escalated_tickets": escalated_count}

# ─────────────────────────────────────────────────────────────
# AI CHAT ENDPOINT
# ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str

class SourceDoc(BaseModel):
    id: str
    title: str
    category: str
    score: float

class ChatResponse(BaseModel):
    layer: int
    intent: str
    reply: str
    priority: str
    suggest_ticket: bool
    ticket_subject: str
    sources: List[SourceDoc]
    auto_ticket_id: Optional[int] = None


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Kargo AI Asistan — 3 Katmanlı Yanıt Mimarisi:
      Katman 1: Deterministik kural motoru (SOS, acil durum vb.)
      Katman 2: RAG — Şirket bilgi bankasından doküman çekimi
      Katman 3: Ollama Local LLM (qwen3:8b) ile yanıt üretimi
    """
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Mesaj boş olamaz.")

    result = await process_chat_message(payload.message.strip())

    # Kritik durumlarda otomatik ticket oluştur (anonim / sistem)
    auto_ticket_id = None
    if result.get("suggest_ticket") and result.get("priority") == "critical":
        try:
            # Sistem kullanıcısı ID=1 ile otomatik açılır
            ticket = SupportTicket(
                customer_id=1,
                subject=result.get("ticket_subject", payload.message[:100]),
                message=payload.message,
                status="open",
                priority="critical",
                intent=result.get("intent"),
                is_escalated=True,
            )
            db.add(ticket)
            db.commit()
            db.refresh(ticket)
            auto_ticket_id = ticket.id
        except Exception:
            pass  # Ticket oluşturma başarısız olsa da chat devam eder

    return ChatResponse(
        layer=result["layer"],
        intent=result["intent"],
        reply=result["reply"],
        priority=result["priority"],
        suggest_ticket=result["suggest_ticket"],
        ticket_subject=result.get("ticket_subject", ""),
        sources=result.get("sources", []),
        auto_ticket_id=auto_ticket_id,
    )


@router.get("/knowledge-base")
def list_knowledge_base():
    """Şirket bilgi bankasındaki dokümanların listesini döndürür."""
    return [
        {
            "id": doc["id"],
            "title": doc["title"],
            "category": doc["category"],
            "tags": doc["tags"],
        }
        for doc in KNOWLEDGE_BASE
    ]


@router.post("/sos", response_model=TicketOut, status_code=201)
def create_sos_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
):
    """S.O.S butonlarından gelen acil durum ticketlarını oluşturur."""
    ticket = SupportTicket(
        customer_id=1,  # Sistem kullanıcısı
        subject=payload.subject,
        message=payload.message,
        status="open",
        priority="critical",
        intent="sos_emergency",
        is_escalated=True,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("", response_model=TicketOut, status_code=201)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Müşteri yeni talep oluşturur."""
    ticket = SupportTicket(
        customer_id=current_user.id,
        subject=payload.subject,
        message=payload.message,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.put("/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: int,
    payload: TicketAdminUpdate,
    db: Session = Depends(get_db)
):
    """Admin: Talep durumunu ve yanıtını günceller."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    data = payload.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.utcnow()
    for k, v in data.items():
        setattr(ticket, k, v)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Destek talebi bulunamadı")
    db.delete(ticket)
    db.commit()
