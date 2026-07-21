from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from app.core.database import get_db
from app.models.customer import CustomerProfile
from app.models.corporate import PriceAgreement
from app.models.order import Order

router = APIRouter(prefix="/corporate", tags=["Kurumsal Müşteri Yönetimi"])

# --- Schemas ---

class PriceAgreementCreate(BaseModel):
    customer_id: int
    tariff_id: Optional[int] = None
    name: str
    discount_rate: float = 0.0
    price_per_kg: Optional[float] = None
    min_volume: int = 0
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None

class PriceAgreementUpdate(BaseModel):
    is_active: Optional[bool] = None
    discount_rate: Optional[float] = None
    notes: Optional[str] = None


@router.get("/customers")
def list_corporate_customers(db: Session = Depends(get_db)):
    """Sadece kurumsal müşterileri getirir."""
    customers = db.query(CustomerProfile).filter(CustomerProfile.customer_type == "corporate").all()
    return customers


@router.get("/customers/{customer_id}/dashboard")
def get_corporate_dashboard(customer_id: int, db: Session = Depends(get_db)):
    """Kurumsal müşteri için özet dashboard verilerini (sipariş hacmi, harcama vb.) döndürür."""
    customer = db.query(CustomerProfile).filter(CustomerProfile.id == customer_id, CustomerProfile.customer_type == "corporate").first()
    if not customer:
        raise HTTPException(status_code=404, detail="Kurumsal müşteri bulunamadı")
    
    orders = db.query(Order).filter(Order.sender_customer_id == customer_id).all()
    
    total_orders = len(orders)
    delivered_orders = len([o for o in orders if o.status == "delivered"])
    total_spent = sum(o.total_price for o in orders if o.total_price)
    
    success_rate = round((delivered_orders / total_orders * 100), 2) if total_orders > 0 else 0
    
    return {
        "customer_id": customer.id,
        "company_name": customer.company_name,
        "total_orders": total_orders,
        "total_spent": total_spent,
        "success_rate": success_rate,
        "recent_orders": [
            {
                "id": o.id,
                "tracking_number": o.tracking_number,
                "status": o.status,
                "total_price": o.total_price,
                "created_at": o.created_at
            }
            for o in sorted(orders, key=lambda x: x.created_at, reverse=True)[:5]
        ]
    }


@router.get("/customers/{customer_id}/reports")
def get_corporate_reports(customer_id: int, start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    """Özel tarih aralığına göre müşteri sipariş raporu."""
    query = db.query(Order).filter(Order.sender_customer_id == customer_id)
    
    if start_date:
        sd = datetime.fromisoformat(start_date)
        query = query.filter(Order.created_at >= sd)
    if end_date:
        ed = datetime.fromisoformat(end_date)
        query = query.filter(Order.created_at <= ed)
        
    orders = query.all()
    
    return {
        "report_count": len(orders),
        "total_revenue": sum(o.total_price for o in orders if o.total_price),
        "data": [
            {
                "tracking_number": o.tracking_number,
                "status": o.status,
                "weight_kg": o.weight_kg,
                "total_price": o.total_price,
                "created_at": o.created_at
            }
            for o in orders
        ]
    }


@router.post("/price-agreements")
def create_price_agreement(payload: PriceAgreementCreate, db: Session = Depends(get_db)):
    agreement = PriceAgreement(**payload.model_dump())
    db.add(agreement)
    db.commit()
    db.refresh(agreement)
    return agreement


@router.get("/price-agreements")
def list_price_agreements(db: Session = Depends(get_db)):
    agreements = db.query(PriceAgreement).all()
    return agreements


@router.put("/price-agreements/{agreement_id}")
def update_price_agreement(agreement_id: int, payload: PriceAgreementUpdate, db: Session = Depends(get_db)):
    agreement = db.query(PriceAgreement).filter(PriceAgreement.id == agreement_id).first()
    if not agreement:
        raise HTTPException(status_code=404, detail="Anlaşma bulunamadı")
    
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(agreement, k, v)
        
    db.commit()
    db.refresh(agreement)
    return agreement
