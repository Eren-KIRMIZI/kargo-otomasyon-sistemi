import math
from typing import List, Tuple


EARTH_RADIUS_KM = 6371.0


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    İki koordinat arasındaki mesafeyi Haversine formülü ile hesaplar.
    Sonuç: kilometre (float)
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def find_nearest(
    target_lat: float,
    target_lon: float,
    candidates: List[dict],
    lat_key: str = "latitude",
    lon_key: str = "longitude",
) -> Tuple[dict, float]:
    """
    Verilen hedef koordinata en yakın adayı döndürür.
    candidates: [{"id": ..., "latitude": ..., "longitude": ...}, ...]
    Dönen: (en_yakin_aday, mesafe_km)
    """
    if not candidates:
        raise ValueError("Aday listesi boş olamaz.")

    best = None
    best_dist = float("inf")

    for c in candidates:
        dist = haversine(target_lat, target_lon, c[lat_key], c[lon_key])
        if dist < best_dist:
            best_dist = dist
            best = c

    return best, best_dist


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """İki nokta arasındaki pusulayı (derece) hesaplar."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lambda = math.radians(lon2 - lon1)
    x = math.sin(d_lambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)
    theta = math.atan2(x, y)
    return (math.degrees(theta) + 360) % 360
