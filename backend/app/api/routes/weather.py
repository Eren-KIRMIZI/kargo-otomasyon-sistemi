import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/weather", tags=["Hava Durumu Etki Modülü"])

# Türkiye'nin 5 büyük şehri için koordinatlar
CITIES = [
    {"name": "İstanbul",  "lat": 41.0082, "lon": 28.9784},
    {"name": "Ankara",    "lat": 39.9334, "lon": 32.8597},
    {"name": "İzmir",     "lat": 38.4237, "lon": 27.1428},
    {"name": "Bursa",     "lat": 40.1826, "lon": 29.0665},
    {"name": "Antalya",   "lat": 36.8969, "lon": 30.7133},
]

# WMO Weather Code → condition mapping
WMO_MAP = {
    0:  {"condition": "clear",      "label": "Açık",           "icon": "☀️"},
    1:  {"condition": "clear",      "label": "Az Bulutlu",      "icon": "🌤️"},
    2:  {"condition": "cloudy",     "label": "Parçalı Bulutlu", "icon": "⛅"},
    3:  {"condition": "cloudy",     "label": "Kapalı",          "icon": "☁️"},
    45: {"condition": "fog",        "label": "Sisli",           "icon": "🌫️"},
    48: {"condition": "fog",        "label": "Yoğun Sis",       "icon": "🌫️"},
    51: {"condition": "rain",       "label": "Hafif Yağmur",    "icon": "🌦️"},
    53: {"condition": "rain",       "label": "Orta Yağmur",     "icon": "🌧️"},
    55: {"condition": "rain",       "label": "Şiddetli Yağmur", "icon": "🌧️"},
    61: {"condition": "rain",       "label": "Hafif Yağış",     "icon": "🌦️"},
    63: {"condition": "rain",       "label": "Yağmurlu",        "icon": "🌧️"},
    65: {"condition": "rain",       "label": "Çok Yağışlı",     "icon": "🌧️"},
    71: {"condition": "snow",       "label": "Hafif Kar",       "icon": "🌨️"},
    73: {"condition": "snow",       "label": "Karlı",           "icon": "❄️"},
    75: {"condition": "snow",       "label": "Yoğun Kar",       "icon": "❄️"},
    77: {"condition": "snow",       "label": "Kar Taneleri",    "icon": "🌨️"},
    80: {"condition": "rain",       "label": "Sağanak",         "icon": "🌧️"},
    81: {"condition": "rain",       "label": "Orta Sağanak",    "icon": "🌧️"},
    82: {"condition": "rain",       "label": "Şiddetli Sağanak","icon": "⛈️"},
    85: {"condition": "snow",       "label": "Kar Sağanağı",    "icon": "🌨️"},
    86: {"condition": "snow",       "label": "Yoğun Kar",       "icon": "❄️"},
    95: {"condition": "storm",      "label": "Fırtına",         "icon": "⛈️"},
    96: {"condition": "storm",      "label": "Dolu Fırtınası",  "icon": "⛈️"},
    99: {"condition": "storm",      "label": "Şiddetli Fırtına","icon": "🌪️"},
}

# Hava durumu → teslimat etki faktörü
IMPACT_FACTORS = {
    "clear":   {"delay_pct": 0,   "label": "Normal",             "color": "#10B981", "severity": "none"},
    "cloudy":  {"delay_pct": 0,   "label": "Normal",             "color": "#10B981", "severity": "none"},
    "fog":     {"delay_pct": 20,  "label": "+%20 Gecikme",       "color": "#F59E0B", "severity": "medium"},
    "rain":    {"delay_pct": 15,  "label": "+%15 Gecikme",       "color": "#3B82F6", "severity": "low"},
    "snow":    {"delay_pct": 40,  "label": "+%40 Gecikme",       "color": "#8B5CF6", "severity": "high"},
    "storm":   {"delay_pct": 60,  "label": "+%60 Gecikme",       "color": "#EF4444", "severity": "critical"},
}


@router.get("/current")
async def get_current_weather():
    """
    Türkiye'nin 5 büyük şehri için open-meteo.com üzerinden canlı hava durumu.
    API key gerektirmez.
    """
    results = []
    lat_str  = ",".join(str(c["lat"]) for c in CITIES)
    lon_str  = ",".join(str(c["lon"]) for c in CITIES)

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat_str}&longitude={lon_str}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature"
        f"&wind_speed_unit=kmh&timezone=Europe%2FIstanbul"
    )

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        # Fallback demo verisi (API erişilemezse)
        import random
        fallback_conditions = ["clear", "rain", "cloudy", "snow", "fog"]
        for i, city in enumerate(CITIES):
            cond = fallback_conditions[i % len(fallback_conditions)]
            wmo_entry = next((v for v in WMO_MAP.values() if v["condition"] == cond), WMO_MAP[0])
            impact    = IMPACT_FACTORS[cond]
            results.append({
                "city": city["name"],
                "temperature": round(random.uniform(5, 30), 1),
                "apparent_temperature": round(random.uniform(3, 28), 1),
                "humidity": random.randint(40, 90),
                "wind_speed": round(random.uniform(5, 40), 1),
                "weather_code": 0,
                "condition": cond,
                "label": wmo_entry["label"],
                "icon": wmo_entry["icon"],
                "delay_pct": impact["delay_pct"],
                "impact_label": impact["label"],
                "impact_color": impact["color"],
                "severity": impact["severity"],
                "source": "fallback",
            })
        return results

    # Tek şehir ise list değil dict döner
    if isinstance(data, dict):
        data = [data]

    for i, city in enumerate(CITIES):
        if i >= len(data):
            break
        d      = data[i]
        curr   = d.get("current", {})
        code   = curr.get("weather_code", 0)
        wmo    = WMO_MAP.get(code, {"condition": "clear", "label": "Bilinmiyor", "icon": "❓"})
        impact = IMPACT_FACTORS.get(wmo["condition"], IMPACT_FACTORS["clear"])

        results.append({
            "city":                 city["name"],
            "temperature":          curr.get("temperature_2m"),
            "apparent_temperature": curr.get("apparent_temperature"),
            "humidity":             curr.get("relative_humidity_2m"),
            "wind_speed":           curr.get("wind_speed_10m"),
            "weather_code":         code,
            "condition":            wmo["condition"],
            "label":                wmo["label"],
            "icon":                 wmo["icon"],
            "delay_pct":            impact["delay_pct"],
            "impact_label":         impact["label"],
            "impact_color":         impact["color"],
            "severity":             impact["severity"],
            "source":               "live",
        })

    return results


class DeliveryImpactRequest(BaseModel):
    condition: str           # clear | fog | rain | snow | storm
    base_minutes: int = 60   # Tahmini normal teslimat süresi (dakika)
    distance_km: Optional[float] = None


@router.post("/delivery-impact")
def calculate_delivery_impact(payload: DeliveryImpactRequest):
    """
    Hava durumuna göre teslimat süresini hesaplar.
    Returns adjusted ETA and breakdown.
    """
    impact = IMPACT_FACTORS.get(payload.condition, IMPACT_FACTORS["clear"])
    delay_pct   = impact["delay_pct"]
    extra_mins  = round(payload.base_minutes * (delay_pct / 100))
    total_mins  = payload.base_minutes + extra_mins

    return {
        "condition":       payload.condition,
        "label":           impact["label"],
        "base_minutes":    payload.base_minutes,
        "delay_pct":       delay_pct,
        "extra_minutes":   extra_mins,
        "total_minutes":   total_mins,
        "severity":        impact["severity"],
        "color":           impact["color"],
        "warning":         impact["severity"] == "critical",
        "message": (
            f"Fırtına nedeniyle teslimatlar askıya alınabilir!" if impact["severity"] == "critical"
            else f"Hava koşulları nedeniyle teslimat süresi yaklaşık {extra_mins} dakika uzayabilir."
            if extra_mins > 0
            else "Normal teslimat koşulları geçerli."
        ),
    }


@router.get("/impact-table")
def get_impact_table():
    """Tüm hava koşulları için etki tablosunu döndürür."""
    return [
        {
            "condition": cond,
            "icon":      next((v["icon"] for v in WMO_MAP.values() if v["condition"] == cond), "❓"),
            **impact
        }
        for cond, impact in IMPACT_FACTORS.items()
    ]
