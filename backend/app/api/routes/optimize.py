from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.order import Order
from app.models.zone import DeliveryZone, ZoneAssignment
from app.models.depot import Depot
from app.schemas.zone import (
    KMeansRequest, DBSCANRequest, ClusterResult, ClusterPoint, ZoneOut
)
from app.services.clustering import kmeans_clustering, dbscan_clustering

router = APIRouter(prefix="/optimize", tags=["Optimizasyon"])

ZONE_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#06B6D4", "#F97316", "#EC4899", "#84CC16", "#6366F1",
]


def _get_order_points(db: Session, province_id: Optional[int], pending_only: bool):
    q = db.query(Order)
    if pending_only:
        q = q.filter(Order.status == "pending")
    if province_id:
        q = q.filter(Order.province_id == province_id)
    orders = q.all()
    return [{"order_id": o.id, "latitude": o.latitude, "longitude": o.longitude} for o in orders]


def _save_zones(db: Session, centers: list, algorithm: str) -> List[DeliveryZone]:
    # Eski zone'ları temizle (aynı algoritma)
    db.query(DeliveryZone).filter(DeliveryZone.algorithm == algorithm).delete()
    db.commit()

    zones = []
    for c in centers:
        zone = DeliveryZone(
            name=f"Bölge {c['cluster_id'] + 1}",
            algorithm=algorithm,
            cluster_id=c["cluster_id"],
            color=c.get("color", ZONE_COLORS[c["cluster_id"] % len(ZONE_COLORS)]),
            center_lat=c["center_lat"],
            center_lon=c["center_lon"],
            is_active=True,
        )
        db.add(zone)
    db.commit()
    zones = db.query(DeliveryZone).filter(DeliveryZone.algorithm == algorithm).all()
    return zones


@router.post("/kmeans", response_model=ClusterResult)
def run_kmeans(payload: KMeansRequest, db: Session = Depends(get_db)):
    points = _get_order_points(db, payload.province_id, payload.use_pending_only)
    if not points:
        raise HTTPException(status_code=404, detail="Kümeleme için yeterli sipariş verisi bulunamadı")

    labeled, silhouette, centers = kmeans_clustering(points, payload.n_clusters)
    zones = _save_zones(db, centers, "kmeans")

    cluster_points = [ClusterPoint(**p) for p in labeled]
    zone_outs = [ZoneOut.model_validate(z) for z in zones]

    return ClusterResult(
        algorithm="kmeans",
        n_clusters=len(centers),
        points=cluster_points,
        zones=zone_outs,
        silhouette_score=round(silhouette, 4) if silhouette else None,
        message=f"K-Means başarılı: {len(centers)} bölge oluşturuldu, {len(points)} sipariş kümelendi.",
    )


@router.post("/dbscan", response_model=ClusterResult)
def run_dbscan(payload: DBSCANRequest, db: Session = Depends(get_db)):
    points = _get_order_points(db, payload.province_id, False)
    if not points:
        raise HTTPException(status_code=404, detail="Kümeleme için sipariş verisi bulunamadı")

    labeled, n_clusters, centers = dbscan_clustering(points, payload.eps, payload.min_samples)
    zones = _save_zones(db, centers, "dbscan") if centers else []

    noise_count = sum(1 for p in labeled if p["cluster_id"] == -1)
    cluster_points = [ClusterPoint(**p) for p in labeled if p["cluster_id"] >= 0]
    zone_outs = [ZoneOut.model_validate(z) for z in zones]

    return ClusterResult(
        algorithm="dbscan",
        n_clusters=n_clusters,
        points=cluster_points,
        zones=zone_outs,
        silhouette_score=None,
        message=f"DBSCAN başarılı: {n_clusters} küme, {noise_count} gürültü noktası, {len(cluster_points)} sipariş kümelendi.",
    )


@router.get("/zones", response_model=List[ZoneOut])
def list_zones(db: Session = Depends(get_db)):
    return db.query(DeliveryZone).filter(DeliveryZone.is_active == True).order_by(DeliveryZone.id).all()
