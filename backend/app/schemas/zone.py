from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class ZoneBase(BaseModel):
    name: str
    algorithm: str = "kmeans"
    color: str = "#3B82F6"
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    geojson: Optional[str] = None


class ZoneCreate(ZoneBase):
    pass


class ZoneOut(ZoneBase):
    id: int
    cluster_id: Optional[int] = None
    order_count: int = 0
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Optimizasyon request/response şemaları ---

class KMeansRequest(BaseModel):
    n_clusters: int = 5
    province_id: Optional[int] = None
    use_pending_only: bool = True


class DBSCANRequest(BaseModel):
    eps: float = 0.5          # km cinsinden — derece'ye çevrilecek
    min_samples: int = 3
    province_id: Optional[int] = None


class ClusterPoint(BaseModel):
    order_id: int
    latitude: float
    longitude: float
    cluster_id: int


class ClusterResult(BaseModel):
    algorithm: str
    n_clusters: int
    points: List[ClusterPoint]
    zones: List[ZoneOut]
    silhouette_score: Optional[float] = None
    message: str


# --- AI Tahmin şemaları ---

class DemandForecastRequest(BaseModel):
    province_id: int
    days_ahead: int = 7
    include_history: bool = True


class DemandForecastPoint(BaseModel):
    date: str
    predicted_orders: float
    confidence_low: float
    confidence_high: float


class DemandForecastResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    province_id: int
    province_name: str
    forecast: List[DemandForecastPoint]
    model_mae: float
    model_rmse: float


class DeliveryTimeRequest(BaseModel):
    distance_km: float
    traffic_level: float = 0.5   # 0.0–1.0
    weight_kg: float = 1.0
    province_id: int
    day_of_week: int = 0
    hour_of_day: int = 9


class DeliveryTimeResponse(BaseModel):
    estimated_hours: float
    confidence_interval: List[float]
    factors: dict
