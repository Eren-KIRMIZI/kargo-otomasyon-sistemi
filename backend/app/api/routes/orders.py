import random
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.order import Order, OrderStatusLog, ReturnOrder
from app.models.depot import Depot
from app.models.location import Province, District
from app.models.courier import Courier
from app.models.tariff import Tariff, Campaign
from app.schemas.order import (
    OrderCreate, OrderUpdate, OrderOut, OrderAssignResponse,
    OrderAssignCourierResponse, ReturnOrderCreate, ReturnOrderOut, TrackingOut
)
from app.services.haversine import find_nearest
import io
from fastapi import Response
import barcode
from barcode.writer import ImageWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
import qrcode
import qrcode.image.pil
import base64

router = APIRouter(prefix="/orders", tags=["Siparişler"])


def _generate_tracking_number(prefix: str = "KRG") -> str:
    suffix = "".join(random.choices(string.digits, k=10))
    return f"{prefix}{suffix}"


def _calculate_desi(width: float, height: float, depth: float) -> float:
    """Standart desi formülü: (En x Boy x Derinlik) / 3000"""
    return round((width * height * depth) / 3000, 2)


def _calculate_price(weight_kg: float, desi: float, tariff: Tariff, campaign: Optional[Campaign] = None):
    """Ağırlık ve desiden büyük olanı baz alarak fiyat hesaplar."""
    billable = max(weight_kg, desi)
    base = tariff.base_price + (billable * max(tariff.price_per_kg, tariff.price_per_desi))
    discount = 0.0
    if campaign and campaign.is_active:
        discount = round(base * (campaign.discount_percentage / 100), 2)
    total = round(base - discount, 2)
    return round(base, 2), discount, total


def _enrich_order(o: Order, db: Session) -> dict:
    province = db.query(Province).filter(Province.id == o.province_id).first()
    district = db.query(District).filter(District.id == o.district_id).first() if o.district_id else None
    depot = db.query(Depot).filter(Depot.id == o.assigned_depot_id).first() if o.assigned_depot_id else None
    courier = db.query(Courier).filter(Courier.id == o.courier_id).first() if o.courier_id else None
    d = {col.name: getattr(o, col.name) for col in o.__table__.columns}
    d["province_name"] = province.name if province else None
    d["district_name"] = district.name if district else None
    d["depot_name"] = depot.name if depot else None
    d["courier_name"] = courier.name if courier else None
    d["status_logs"] = [
        {col.name: getattr(log, col.name) for col in log.__table__.columns}
        for log in (o.status_logs or [])
    ]
    return d


def _add_status_log(db: Session, order: Order, status: str, location_note: str = None, note: str = None):
    log = OrderStatusLog(
        order_id=order.id,
        status=status,
        location_note=location_note,
        note=note
    )
    db.add(log)


@router.get("", response_model=List[OrderOut])
def list_orders(
    status: Optional[str] = None,
    province_id: Optional[int] = None,
    depot_id: Optional[int] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    q = db.query(Order)
    if status:
        q = q.filter(Order.status == status)
    if province_id:
        q = q.filter(Order.province_id == province_id)
    if depot_id:
        q = q.filter(Order.assigned_depot_id == depot_id)
    orders = q.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    return [_enrich_order(o, db) for o in orders]


@router.get("/stats", response_model=dict)
def order_stats(db: Session = Depends(get_db)):
    total = db.query(Order).count()
    pending = db.query(Order).filter(Order.status == "pending").count()
    in_transit = db.query(Order).filter(Order.status == "in_transit").count()
    out_for_delivery = db.query(Order).filter(Order.status == "out_for_delivery").count()
    delivered = db.query(Order).filter(Order.status == "delivered").count()
    failed = db.query(Order).filter(Order.status == "failed").count()
    returned = db.query(Order).filter(Order.status == "returned").count()
    return {
        "total": total, "pending": pending, "in_transit": in_transit,
        "out_for_delivery": out_for_delivery, "delivered": delivered,
        "failed": failed, "returned": returned,
    }


@router.get("/track/{tracking_number}", response_model=TrackingOut)
def track_order(tracking_number: str, db: Session = Depends(get_db)):
    """Public endpoint — Takip numarasıyla kargo durumunu sorgular."""
    o = db.query(Order).filter(Order.tracking_number == tracking_number).first()
    if not o:
        raise HTTPException(status_code=404, detail="Takip numarası bulunamadı")
    province = db.query(Province).filter(Province.id == o.province_id).first()
    district = db.query(District).filter(District.id == o.district_id).first() if o.district_id else None
    return {
        "tracking_number": o.tracking_number,
        "status": o.status,
        "customer_name": o.customer_name,
        "receiver_name": o.receiver_name,
        "province_name": province.name if province else None,
        "district_name": district.name if district else None,
        "estimated_delivery": o.estimated_delivery,
        "delivered_at": o.delivered_at,
        "status_logs": [
            {col.name: getattr(log, col.name) for col in log.__table__.columns}
            for log in sorted(o.status_logs, key=lambda x: x.created_at)
        ],
    }


@router.get("/scan/{tracking_number}", response_model=dict)
def scan_barcode(tracking_number: str, db: Session = Depends(get_db)):
    """Barkod/QR okuma sonucunu işler — takip numarasına göre sipariş bilgisi döndürür."""
    o = db.query(Order).filter(Order.tracking_number == tracking_number).first()
    if not o:
        raise HTTPException(status_code=404, detail=f"'{tracking_number}' takip numarasına sahip kargo bulunamadı")
    province = db.query(Province).filter(Province.id == o.province_id).first()
    district = db.query(District).filter(District.id == o.district_id).first() if o.district_id else None
    depot = db.query(Depot).filter(Depot.id == o.assigned_depot_id).first() if o.assigned_depot_id else None
    return {
        "found": True,
        "order_id": o.id,
        "tracking_number": o.tracking_number,
        "status": o.status,
        "customer_name": o.customer_name,
        "receiver_name": o.receiver_name,
        "receiver_phone": o.receiver_phone,
        "receiver_address": o.receiver_address,
        "province_name": province.name if province else None,
        "district_name": district.name if district else None,
        "depot_name": depot.name if depot else None,
        "weight_kg": o.weight_kg,
        "desi": o.desi,
        "total_price": o.total_price,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "estimated_delivery": o.estimated_delivery,
    }


@router.post("/returns", response_model=ReturnOrderOut, status_code=201)
def create_return(
    payload: ReturnOrderCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """İade kargo oluşturur."""
    original = db.query(Order).filter(Order.id == payload.original_order_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Orijinal sipariş bulunamadı")
    if original.status not in ("delivered", "failed"):
        raise HTTPException(status_code=400, detail="Sadece teslim edilmiş veya başarısız siparişler için iade açılabilir")
        
    existing_return = db.query(ReturnOrder).filter(ReturnOrder.original_order_id == payload.original_order_id).first()
    if existing_return:
        raise HTTPException(status_code=400, detail="Bu sipariş için zaten bir iade kaydı mevcut")

    return_order = ReturnOrder(
        return_tracking_number=_generate_tracking_number("RET"),
        original_order_id=payload.original_order_id,
        reason=payload.reason,
        status="pending",
    )
    original.status = "returned"
    _add_status_log(db, original, "returned", note=f"İade başlatıldı: {payload.reason or '-'}")
    db.add(return_order)
    db.commit()
    db.refresh(return_order)
    return return_order


@router.get("/returns/{return_id}", response_model=ReturnOrderOut)
def get_return(return_id: int, db: Session = Depends(get_db)):
    r = db.query(ReturnOrder).filter(ReturnOrder.id == return_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="İade kaydı bulunamadı")
    return r


@router.get("/returns", response_model=List[ReturnOrderOut])
def list_returns(
    status: Optional[str] = None,
    reason: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    q = db.query(ReturnOrder)
    if status:
        q = q.filter(ReturnOrder.status == status)
    if reason:
        q = q.filter(ReturnOrder.reason == reason)
    returns = q.order_by(ReturnOrder.created_at.desc()).offset(offset).limit(limit).all()
    return returns


class ReturnOrderUpdate(BaseModel):
    status: Optional[str] = None
    reason: Optional[str] = None


@router.put("/returns/{return_id}", response_model=ReturnOrderOut)
def update_return(return_id: int, payload: ReturnOrderUpdate, db: Session = Depends(get_db)):
    r = db.query(ReturnOrder).filter(ReturnOrder.id == return_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="İade kaydı bulunamadı")
    
    update_data = payload.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] != r.status:
        # Status change log can be added here if needed
        pass
        
    for k, v in update_data.items():
        setattr(r, k, v)
        
    db.commit()
    db.refresh(r)
    return r


@router.get("/returns-analytics")
def get_return_analytics(db: Session = Depends(get_db)):
    """İade nedenleri ve durumları için analitik verisi."""
    from sqlalchemy import func
    
    # Nedenlere göre gruplama
    reason_counts = db.query(ReturnOrder.reason, func.count(ReturnOrder.id)).group_by(ReturnOrder.reason).all()
    reasons = [{"reason": r[0] or "Belirtilmemiş", "count": r[1]} for r in reason_counts]
    
    # Durumlara göre gruplama
    status_counts = db.query(ReturnOrder.status, func.count(ReturnOrder.id)).group_by(ReturnOrder.status).all()
    statuses = [{"status": s[0], "count": s[1]} for s in status_counts]
    
    total = sum(s["count"] for s in statuses)
    
    return {
        "total_returns": total,
        "by_reason": reasons,
        "by_status": statuses
    }


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    return _enrich_order(o, db)


@router.post("", response_model=OrderOut, status_code=201)
def create_order(
    payload: OrderCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    data = payload.model_dump()

    # Desi hesaplama (boyutlar girilmişse)
    if data.get("width_cm") and data.get("height_cm") and data.get("depth_cm"):
        data["desi"] = _calculate_desi(data["width_cm"], data["height_cm"], data["depth_cm"])

    # Otomatik fiyat hesaplama
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
            order = Order(**data, tracking_number=_generate_tracking_number())
            db.add(order)
            db.commit()
            db.refresh(order)
            break
        except IntegrityError:
            db.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail="Sipariş oluşturulamadı (Takip no çakışması)")

    _add_status_log(db, order, "pending", note="Kargo sisteme kaydedildi")
    db.commit()

    return _enrich_order(order, db)


@router.put("/{order_id}", response_model=OrderOut)
def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

    update_data = payload.model_dump(exclude_unset=True)

    # Durum değişmişse log tut
    if "status" in update_data and update_data["status"] != o.status:
        _add_status_log(db, o, update_data["status"])

    for field, value in update_data.items():
        setattr(o, field, value)

    db.commit()
    db.refresh(o)
    return _enrich_order(o, db)


@router.post("/{order_id}/assign-depot", response_model=OrderAssignResponse)
def assign_nearest_depot(order_id: int, db: Session = Depends(get_db)):
    """Haversine formülü ile siparişe en yakın depoyu atar."""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

    depots = db.query(Depot).filter(Depot.is_active == True).all()
    if not depots:
        raise HTTPException(status_code=404, detail="Aktif depo bulunamadı")

    candidates = [{"id": d.id, "latitude": d.latitude, "longitude": d.longitude, "name": d.name} for d in depots]
    best, dist = find_nearest(o.latitude, o.longitude, candidates)

    o.assigned_depot_id = best["id"]
    o.status = "in_transit"
    _add_status_log(db, o, "in_transit", location_note=best["name"],
                    note=f"En yakın depo '{best['name']}' atandı ({round(dist, 2)} km)")
    db.commit()

    return {
        "order_id": order_id,
        "assigned_depot_id": best["id"],
        "depot_name": best["name"],
        "distance_km": round(dist, 2),
        "message": f"Sipariş '{best['name']}' deposuna atandı ({round(dist, 2)} km)",
    }


@router.post("/{order_id}/assign-courier", response_model=OrderAssignCourierResponse)
def assign_nearest_courier(order_id: int, db: Session = Depends(get_db)):
    """Siparişe mesafesi ve araç kapasitesi uygun olan en yakın kuryeyi atar."""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

    q = db.query(Courier).filter(Courier.is_active == True, Courier.status == "available")
    if o.assigned_depot_id:
        q = q.filter(Courier.depot_id == o.assigned_depot_id)

    couriers = q.all()
    if not couriers:
        raise HTTPException(status_code=404, detail="Uygun kurye bulunamadı")

    candidates = []
    for c in couriers:
        capacity = c.vehicle.capacity_kg if c.vehicle else 100.0
        if capacity < o.weight_kg:
            continue
        lat = c.latitude if c.latitude is not None else (c.depot.latitude if c.depot else 0)
        lon = c.longitude if c.longitude is not None else (c.depot.longitude if c.depot else 0)
        candidates.append({"id": c.id, "latitude": lat, "longitude": lon, "name": c.name})

    if not candidates:
        raise HTTPException(status_code=404, detail="Bu siparişi taşıyabilecek kapasitede uygun kurye bulunamadı")

    best, dist = find_nearest(o.latitude, o.longitude, candidates)

    o.courier_id = best["id"]
    o.status = "out_for_delivery"
    _add_status_log(db, o, "out_for_delivery",
                    note=f"Kurye '{best['name']}' atandı, dağıtıma çıktı")
    db.commit()

    return {
        "order_id": order_id,
        "courier_id": best["id"],
        "courier_name": best["name"],
        "distance_km": round(dist, 2),
        "message": f"Sipariş '{best['name']}' isimli kuryeye atandı ({round(dist, 2)} km mesafede)",
    }


@router.post("/{order_id}/deliver", response_model=OrderOut)
def confirm_delivery(order_id: int, delivery_proof_url: Optional[str] = None,
                     delivery_note: Optional[str] = None, db: Session = Depends(get_db)):
    """Teslimat onayı — kargo teslim edildi olarak işaretler."""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    o.status = "delivered"
    o.delivered_at = datetime.utcnow()
    if delivery_proof_url:
        o.delivery_proof_url = delivery_proof_url
    if delivery_note:
        o.delivery_note = delivery_note
    _add_status_log(db, o, "delivered", note=delivery_note or "Kargo başarıyla teslim edildi")
    db.commit()
    db.refresh(o)
    return _enrich_order(o, db)


@router.delete("/{order_id}", status_code=204)
def delete_order(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    db.delete(o)
    db.commit()


@router.get("/{order_id}/label", response_class=Response)
def get_order_label(order_id: int, db: Session = Depends(get_db)):
    """Sipariş için barkodlu PDF kargo etiketi oluşturur."""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    
    # Barkod oluştur (PNG formatında byte stream)
    rv = io.BytesIO()
    code128 = barcode.get_barcode_class('code128')
    # Tracking numarası KRG1234567890 gibi
    bc = code128(o.tracking_number, writer=ImageWriter())
    bc.write(rv)
    rv.seek(0)
    barcode_img = ImageReader(rv)

    # PDF oluştur (A6 boyutu etiket için uygundur)
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=A6)
    width, height = A6

    # Çerçeve çiz
    c.setLineWidth(1)
    c.rect(5*mm, 5*mm, width - 10*mm, height - 10*mm)

    # Başlık
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width/2, height - 15*mm, "KARGO ENTERPRISES")
    c.line(10*mm, height - 18*mm, width - 10*mm, height - 18*mm)

    def tr_to_en(text):
        if not text:
            return ""
        replacements = {
            'ç': 'c', 'Ç': 'C',
            'ğ': 'g', 'Ğ': 'G',
            'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O',
            'ş': 's', 'Ş': 'S',
            'ü': 'u', 'Ü': 'U'
        }
        res = str(text)
        for k, v in replacements.items():
            res = res.replace(k, v)
        return res

    # Gönderen ve Alıcı Bilgileri
    c.setFont("Helvetica-Bold", 10)
    c.drawString(10*mm, height - 30*mm, "Gonderici:")
    c.setFont("Helvetica", 10)
    c.drawString(30*mm, height - 30*mm, tr_to_en(o.customer_name))

    c.setFont("Helvetica-Bold", 10)
    c.drawString(10*mm, height - 40*mm, "Alici:")
    c.setFont("Helvetica", 10)
    c.drawString(30*mm, height - 40*mm, tr_to_en(o.receiver_name or "-"))

    c.setFont("Helvetica-Bold", 10)
    c.drawString(10*mm, height - 50*mm, "Tel:")
    c.setFont("Helvetica", 10)
    c.drawString(30*mm, height - 50*mm, tr_to_en(o.receiver_phone or "-"))

    c.setFont("Helvetica-Bold", 10)
    c.drawString(10*mm, height - 60*mm, "Adres:")
    c.setFont("Helvetica", 8)
    
    # Adres uzunsa satırlara böl
    address_text = tr_to_en(o.recipient_address or "-")
    from textwrap import wrap
    lines = wrap(address_text, width=45)
    y_pos = height - 60*mm
    for line in lines:
        c.drawString(30*mm, y_pos, line)
        y_pos -= 4*mm

    # Ayırıcı çizgi
    c.line(10*mm, y_pos - 5*mm, width - 10*mm, y_pos - 5*mm)

    # Kargo Detayları
    c.setFont("Helvetica-Bold", 10)
    c.drawString(10*mm, y_pos - 15*mm, "Agirlik:")
    c.setFont("Helvetica", 10)
    c.drawString(30*mm, y_pos - 15*mm, f"{o.weight_kg} kg")

    c.setFont("Helvetica-Bold", 10)
    c.drawString(55*mm, y_pos - 15*mm, "Desi:")
    c.setFont("Helvetica", 10)
    c.drawString(70*mm, y_pos - 15*mm, f"{o.desi or '-'}")

    # Barkod Çizimi
    barcode_y = 15*mm
    barcode_height = 25*mm
    barcode_width = 80*mm
    c.drawImage(barcode_img, (width - barcode_width)/2, barcode_y, width=barcode_width, height=barcode_height)

    # Alt Bilgi
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, 8*mm, f"Tarih: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")

    c.save()
    pdf_buffer.seek(0)
    
    headers = {
        "Content-Disposition": f'attachment; filename="etiket_{o.tracking_number}.pdf"'
    }
    return Response(content=pdf_buffer.getvalue(), media_type="application/pdf", headers=headers)


@router.get("/{order_id}/barcode-image", response_class=Response)
def get_barcode_image(order_id: int, db: Session = Depends(get_db)):
    """Sipariş için Code128 barkod PNG görüntüsü döndürür."""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

    rv = io.BytesIO()
    code128 = barcode.get_barcode_class('code128')
    bc = code128(o.tracking_number, writer=ImageWriter())
    bc.write(rv, options={"module_height": 15, "font_size": 10, "text_distance": 4, "quiet_zone": 4})
    rv.seek(0)
    return Response(content=rv.getvalue(), media_type="image/png")


@router.get("/{order_id}/qrcode", response_class=Response)
def get_qr_code(order_id: int, db: Session = Depends(get_db)):
    """Sipariş için takip URL'si içeren QR kod PNG görüntüsü döndürür."""
    o = db.query(Order).filter(Order.id == order_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

    frontend_url = settings.CORS_ORIGINS.split(',')[0].strip()
    tracking_url = f"{frontend_url}/track/{o.tracking_number}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(tracking_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")


