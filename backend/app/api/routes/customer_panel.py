from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.order import Order
from app.models.customer import WalletTransaction, ReturnCode
from app.schemas.order import OrderCreate, OrderOut
from app.schemas.customer import WalletTransactionOut, WalletDeposit, ReturnCodeCreate, ReturnCodeOut
from app.api.deps import get_current_active_user
from app.api.routes.orders import _generate_tracking_number, _calculate_desi, _calculate_price, _enrich_order, _add_status_log
from app.models.tariff import Tariff, Campaign

router = APIRouter(prefix="/customer", tags=["Müşteri Paneli"])

def verify_customer(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Yalnızca müşteriler bu alana erişebilir.")
    user_with_profile = db.query(User).options(joinedload(User.customer_profile)).filter(User.id == current_user.id).first()
    if not user_with_profile.customer_profile:
        raise HTTPException(status_code=400, detail="Kullanıcıya ait müşteri profili bulunamadı.")
    return user_with_profile

@router.get("/orders", response_model=List[OrderOut])
def list_my_orders(
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_customer)
):
    """
    Müşterinin sadece kendi gönderdiği veya alıcısı olduğu kargoları listeler.
    """
    customer_id = current_user.customer_profile.id
    orders = db.query(Order).filter(
        (Order.sender_customer_id == customer_id) | 
        (Order.receiver_customer_id == customer_id)
    ).order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    
    return [_enrich_order(o, db) for o in orders]

@router.post("/orders", response_model=OrderOut, status_code=201)
def create_my_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_customer)
):
    """
    Müşterinin yeni bir kargo oluşturması. sender_customer_id otomatik olarak giriş yapan kullanıcı olur.
    """
    data = payload.model_dump()
    data["sender_customer_id"] = current_user.customer_profile.id
    
    # Desi hesaplama
    if data.get("width_cm") and data.get("height_cm") and data.get("depth_cm"):
        data["desi"] = _calculate_desi(data["width_cm"], data["height_cm"], data["depth_cm"])

    # Otomatik fiyat hesaplama (müşteri tarafında tahmini fiyat gösterimi için kullanılabilir)
    tariff = None
    campaign = None
    if data.get("tariff_id"):
        tariff = db.query(Tariff).filter(Tariff.id == data["tariff_id"]).first()
    if not tariff:
        tariff = db.query(Tariff).filter(Tariff.is_active == True).first()

    if data.get("campaign_id"):
        campaign = db.query(Campaign).filter(Campaign.id == data["campaign_id"]).first()

    if tariff:
        base, discount, total = _calculate_price(data["weight_kg"], data["desi"], tariff, campaign)
        data["tariff_id"] = tariff.id
        data["base_price"] = base
        data["discount_amount"] = discount
        data["total_price"] = total

    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Ödeme yöntemi kontrolü
            if data.get("payment_method") == "wallet":
                current_balance = current_user.customer_profile.wallet_balance or 0.0
                if current_balance < data.get("total_price", 0):
                    raise HTTPException(status_code=400, detail="Cüzdan bakiyeniz yetersiz.")
                # Bakiyeden düş
                current_user.customer_profile.wallet_balance = current_balance - data.get("total_price", 0)
                data["is_paid"] = True
                
                # Cüzdan hareketi kaydet
                wallet_tx = WalletTransaction(
                    customer_id=current_user.customer_profile.id,
                    amount=-data.get("total_price", 0),
                    transaction_type="payment",
                    description="Kargo gönderim ücreti (Sipariş bekleniyor)"
                )
                db.add(wallet_tx)

            order = Order(**data, tracking_number=_generate_tracking_number())
            db.add(order)
            db.commit()
            db.refresh(order)
            
            # Eğer cüzdan ödemesi yapıldıysa, log açıklamasına takip numarasını ekleyelim
            if data.get("payment_method") == "wallet":
                wallet_tx.description = f"Kargo gönderim ücreti ({order.tracking_number})"
                db.commit()
                
            break
        except IntegrityError:
            db.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail="Sipariş oluşturulamadı (Takip no çakışması)")

    _add_status_log(db, order, "pending", note="Kargo müşteri tarafından sisteme eklendi")
    db.commit()

    return _enrich_order(order, db)

@router.get("/stats")
def my_order_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_customer)
):
    customer_id = current_user.customer_profile.id
    
    total = db.query(Order).filter(Order.sender_customer_id == customer_id).count()
    pending = db.query(Order).filter(Order.sender_customer_id == customer_id, Order.status == "pending").count()
    in_transit = db.query(Order).filter(Order.sender_customer_id == customer_id, Order.status == "in_transit").count()
    delivered = db.query(Order).filter(Order.sender_customer_id == customer_id, Order.status == "delivered").count()
    
    return {
        "total": total,
        "pending": pending,
        "in_transit": in_transit,
        "delivered": delivered
    }

@router.get("/wallet")
def get_wallet_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_customer)
):
    customer_id = current_user.customer_profile.id
    balance = current_user.customer_profile.wallet_balance or 0.0
    transactions = db.query(WalletTransaction).filter(WalletTransaction.customer_id == customer_id).order_by(WalletTransaction.created_at.desc()).all()
    
    return {
        "balance": balance,
        "transactions": [WalletTransactionOut.model_validate(t) for t in transactions]
    }

@router.post("/wallet/deposit")
def deposit_wallet(
    payload: WalletDeposit,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_customer)
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Yükleme tutarı 0'dan büyük olmalıdır.")
        
    customer_profile = current_user.customer_profile
    current_balance = customer_profile.wallet_balance or 0.0
    customer_profile.wallet_balance = current_balance + payload.amount
    
    tx = WalletTransaction(
        customer_id=customer_profile.id,
        amount=payload.amount,
        transaction_type="deposit",
        description="Kredi Kartı ile Bakiye Yükleme"
    )
    db.add(tx)
    db.commit()
    
    return {"message": "Bakiye başarıyla yüklendi", "new_balance": customer_profile.wallet_balance}

@router.get("/return-codes", response_model=List[ReturnCodeOut])
def list_return_codes(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_customer)
):
    customer_id = current_user.customer_profile.id
    codes = db.query(ReturnCode).filter(ReturnCode.customer_id == customer_id).order_by(ReturnCode.created_at.desc()).all()
    return codes

@router.post("/return-codes", response_model=ReturnCodeOut)
def create_return_code(
    payload: ReturnCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_customer)
):
    customer_id = current_user.customer_profile.id
    # 7 gün geçerlilik süresi (kullanıcı talebi)
    expires = datetime.utcnow() + timedelta(days=7)
    
    # Kodu üret (KRG-RET-XXXX)
    code_str = f"RET-{uuid.uuid4().hex[:6].upper()}"
    
    new_code = ReturnCode(
        customer_id=customer_id,
        code=code_str,
        description=payload.description,
        is_active=True,
        expires_at=expires
    )
    db.add(new_code)
    db.commit()
    db.refresh(new_code)
    
    return new_code

