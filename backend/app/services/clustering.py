import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score


ZONE_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#06B6D4", "#F97316", "#EC4899", "#84CC16", "#6366F1",
    "#14B8A6", "#F43F5E", "#A855F7", "#22C55E", "#EAB308",
]


def kmeans_clustering(
    points: List[Dict[str, Any]],
    n_clusters: int = 5,
) -> Tuple[List[Dict], float, List[Dict]]:
    """
    K-Means kümeleme algoritması.
    points: [{"order_id": int, "latitude": float, "longitude": float}, ...]
    Dönen: (etiketlenmiş_noktalar, silhouette_skoru, merkez_listesi)
    """
    if len(points) < n_clusters:
        n_clusters = max(1, len(points))

    coords = np.array([[p["latitude"], p["longitude"]] for p in points])

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(coords)
    centers = kmeans.cluster_centers_

    silhouette = 0.0
    if len(set(labels)) > 1:
        silhouette = float(silhouette_score(coords, labels))

    labeled_points = []
    for i, p in enumerate(points):
        labeled_points.append({**p, "cluster_id": int(labels[i])})

    cluster_centers = [
        {"cluster_id": i, "center_lat": float(centers[i][0]), "center_lon": float(centers[i][1]),
         "color": ZONE_COLORS[i % len(ZONE_COLORS)]}
        for i in range(n_clusters)
    ]

    return labeled_points, silhouette, cluster_centers


def dbscan_clustering(
    points: List[Dict[str, Any]],
    eps_km: float = 10.0,
    min_samples: int = 3,
) -> Tuple[List[Dict], int, List[Dict]]:
    """
    DBSCAN yoğunluk bazlı kümeleme algoritması.
    eps_km: km cinsinden komşuluk yarıçapı (derece'ye çevrilir: 1° ≈ 111 km)
    Dönen: (etiketlenmiş_noktalar, küme_sayısı, merkez_listesi)
    """
    if not points:
        return [], 0, []

    eps_deg = eps_km / 111.0   # Yaklaşık dönüşüm

    coords = np.array([[p["latitude"], p["longitude"]] for p in points])

    db = DBSCAN(eps=eps_deg, min_samples=min_samples, algorithm="ball_tree", metric="haversine")
    labels = db.fit_predict(np.radians(coords))

    unique_labels = set(labels)
    n_clusters = len(unique_labels - {-1})

    # Küme merkezlerini hesapla
    cluster_centers = []
    for label in sorted(unique_labels):
        if label == -1:
            continue
        mask = labels == label
        center_lat = float(coords[mask, 0].mean())
        center_lon = float(coords[mask, 1].mean())
        cluster_centers.append({
            "cluster_id": int(label),
            "center_lat": center_lat,
            "center_lon": center_lon,
            "color": ZONE_COLORS[int(label) % len(ZONE_COLORS)],
            "point_count": int(mask.sum()),
        })

    labeled_points = []
    for i, p in enumerate(points):
        labeled_points.append({**p, "cluster_id": int(labels[i])})

    return labeled_points, n_clusters, cluster_centers
