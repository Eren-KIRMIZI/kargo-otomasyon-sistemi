from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis_client import get_redis_client
from app.core.rate_limiter import is_rate_limited
from app.core.config import settings
from app.models.history import OrderHistory
from app.models.location import Province
from app.schemas.zone import (
    DemandForecastRequest, DemandForecastResponse, DemandForecastPoint,
    DeliveryTimeRequest, DeliveryTimeResponse,
)
from app.services.ml_models import (
    train_demand_model, predict_demand,
    train_delivery_model, predict_delivery_time,
)

router = APIRouter(prefix="/ai", tags=["Yapay Zeka"])


@router.post("/demand-forecast", response_model=DemandForecastResponse)
async def demand_forecast(request: Request, payload: DemandForecastRequest, db: Session = Depends(get_db)):
    # ─── Rate Limiting ────────────────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    redis = await get_redis_client()
    limited, rl_headers = await is_rate_limited(
        redis, identifier=client_ip, prefix="rl:ai",
        max_requests=settings.REDIS_AI_RATE_LIMIT, window_seconds=60
    )
    if limited:
        raise HTTPException(
            status_code=429,
            detail=f"Çok fazla istek. {rl_headers.get('Retry-After', 60)} saniye sonra tekrar deneyin.",
            headers=rl_headers,
        )
    # ─────────────────────────────────────────────────────────────────────────
    province = db.query(Province).filter(Province.id == payload.province_id).first()
    if not province:
        raise HTTPException(status_code=404, detail="İl bulunamadı")

    # Geçmiş verilerle model eğit (varsa)
    if payload.include_history:
        history = db.query(OrderHistory).filter(
            OrderHistory.province_id == payload.province_id
        ).all()
        records = [
            {
                "day_of_week": h.day_of_week,
                "month": h.month,
                "is_holiday": h.is_holiday,
                "weather_score": h.weather_score,
                "province_id": h.province_id,
                "order_count": float(h.order_count),
            }
            for h in history
        ]
        if records:
            train_demand_model(records)

    now = datetime.utcnow()
    forecasts_raw, metrics = predict_demand(
        province_id=payload.province_id,
        days_ahead=payload.days_ahead,
        base_day_of_week=now.weekday(),
        base_month=now.month,
    )

    forecast_points = []
    from datetime import timedelta
    for i, f in enumerate(forecasts_raw):
        date = (now + timedelta(days=i)).strftime("%Y-%m-%d")
        forecast_points.append(DemandForecastPoint(
            date=date,
            predicted_orders=f["predicted_orders"],
            confidence_low=f["confidence_low"],
            confidence_high=f["confidence_high"],
        ))

    return DemandForecastResponse(
        province_id=payload.province_id,
        province_name=province.name,
        forecast=forecast_points,
        model_mae=metrics["mae"],
        model_rmse=metrics["rmse"],
    )


@router.post("/delivery-time", response_model=DeliveryTimeResponse)
def delivery_time_estimate(payload: DeliveryTimeRequest, db: Session = Depends(get_db)):
    # Geçmiş verilerle model eğit (varsa)
    history = db.query(OrderHistory).all()
    records = [
        {
            "distance_km": h.distance_km,
            "traffic_level": h.traffic_level,
            "avg_weight": h.avg_weight,
            "day_of_week": h.day_of_week,
            "month": h.month,
            "is_holiday": h.is_holiday,
            "weather_score": h.weather_score,
            "avg_delivery_hours": h.avg_delivery_hours,
        }
        for h in history
    ]
    if records:
        train_delivery_model(records)

    result = predict_delivery_time(
        distance_km=payload.distance_km,
        traffic_level=payload.traffic_level,
        weight_kg=payload.weight_kg,
        province_id=payload.province_id,
        day_of_week=payload.day_of_week,
        hour_of_day=payload.hour_of_day,
    )

    return DeliveryTimeResponse(
        estimated_hours=result["estimated_hours"],
        confidence_interval=result["confidence_interval"],
        factors=result["factors"],
    )


@router.post("/retrain", response_model=dict)
def retrain_models(db: Session = Depends(get_db)):
    """Tüm modelleri geçmiş verilerle yeniden eğit."""
    history = db.query(OrderHistory).all()
    records = [
        {
            "day_of_week": h.day_of_week,
            "month": h.month,
            "is_holiday": h.is_holiday,
            "weather_score": h.weather_score,
            "province_id": h.province_id,
            "order_count": float(h.order_count),
            "distance_km": h.distance_km,
            "traffic_level": h.traffic_level,
            "avg_weight": h.avg_weight,
            "avg_delivery_hours": h.avg_delivery_hours,
        }
        for h in history
    ]
    demand_metrics = train_demand_model(records) if records else {"mae": 0, "rmse": 0}
    delivery_metrics = train_delivery_model(records) if records else {"mae": 0, "rmse": 0}
    return {
        "status": "success",
        "training_records": len(records),
        "demand_model": demand_metrics,
        "delivery_model": delivery_metrics,
    }
