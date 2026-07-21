from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.tariff import Tariff, Campaign
from app.models.order import Order
from app.schemas.tariff import TariffCreate, TariffOut, CampaignCreate, CampaignOut

router = APIRouter(tags=["Fiyatlandırma ve Tarifeler"])

@router.get("/tariffs", response_model=List[TariffOut])
def get_tariffs(db: Session = Depends(get_db)):
    return db.query(Tariff).all()

@router.post("/tariffs", response_model=TariffOut)
def create_tariff(
    tariff: TariffCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_tariff = Tariff(**tariff.model_dump())
    db.add(db_tariff)
    db.commit()
    db.refresh(db_tariff)
    return db_tariff

@router.put("/tariffs/{tariff_id}", response_model=TariffOut)
def update_tariff(
    tariff_id: int, 
    tariff: TariffCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not db_tariff:
        raise HTTPException(status_code=404, detail="Tarife bulunamadı")
    for k, v in tariff.model_dump(exclude_unset=True).items():
        setattr(db_tariff, k, v)
    db.commit()
    db.refresh(db_tariff)
    return db_tariff

@router.delete("/tariffs/{tariff_id}", status_code=204)
def delete_tariff(
    tariff_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_tariff = db.query(Tariff).filter(Tariff.id == tariff_id).first()
    if not db_tariff:
        raise HTTPException(status_code=404, detail="Tarife bulunamadı")
        
    linked_orders = db.query(Order).filter(Order.tariff_id == tariff_id).first()
    if linked_orders:
        raise HTTPException(status_code=400, detail="Bu tarife kullanılarak oluşturulmuş siparişler var. Tarife silinemez.")
        
    db.delete(db_tariff)
    db.commit()

@router.get("/campaigns", response_model=List[CampaignOut])
def get_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).all()

@router.post("/campaigns", response_model=CampaignOut)
def create_campaign(
    campaign: CampaignCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    existing = db.query(Campaign).filter(Campaign.code == campaign.code).first()
    if existing:
         raise HTTPException(status_code=400, detail="Bu kampanya kodu zaten mevcut")
    db_campaign = Campaign(**campaign.model_dump())
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@router.put("/campaigns/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: int, 
    campaign: CampaignCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadı")
    for k, v in campaign.model_dump(exclude_unset=True).items():
        setattr(db_campaign, k, v)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

@router.delete("/campaigns/{campaign_id}", status_code=204)
def delete_campaign(
    campaign_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Kampanya bulunamadı")
        
    linked_orders = db.query(Order).filter(Order.campaign_id == campaign_id).first()
    if linked_orders:
        raise HTTPException(status_code=400, detail="Bu kampanyayı kullanan siparişler var. Kampanya silinemez.")
    db.delete(db_campaign)
    db.commit()

