import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor
import math

# ─── Global model önbelleği (uygulama ömrü boyunca) ───────────────────────────
_demand_model: Optional[XGBRegressor] = None
_delivery_model: Optional[RandomForestRegressor] = None
_demand_metrics: Dict = {"mae": 0.0, "rmse": 0.0}
_delivery_metrics: Dict = {"mae": 0.0, "rmse": 0.0}


# ═══════════════════════════════════════════════════════════════════
#  TALEP TAHMİNİ  —  XGBoost
# ═══════════════════════════════════════════════════════════════════

def _build_demand_features(df: pd.DataFrame) -> pd.DataFrame:
    """order_history DataFrame'inden özellik sütunları üretir."""
    df = df.copy()
    df["day_of_week_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["day_of_week_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    return df


def train_demand_model(history_records: List[Dict]) -> Dict:
    """
    XGBoost talep tahmin modelini eğitir.
    history_records: order_history tablosundan çekilen kayıtlar listesi
    Dönen: {"mae": float, "rmse": float}
    """
    global _demand_model, _demand_metrics

    if not history_records:
        return {"mae": 0.0, "rmse": 0.0}

    df = pd.DataFrame(history_records)
    df = _build_demand_features(df)

    feature_cols = [
        "day_of_week", "month", "is_holiday", "weather_score",
        "day_of_week_sin", "day_of_week_cos", "month_sin", "month_cos",
    ]
    if "province_id" in df.columns:
        feature_cols.append("province_id")

    X = df[feature_cols].fillna(0)
    y = df["order_count"]

    if len(X) < 10:
        X_train, X_test, y_train, y_test = X, X, y, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBRegressor(
        n_estimators=200, max_depth=4, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(math.sqrt(mean_squared_error(y_test, preds)))

    _demand_model = model
    _demand_metrics = {"mae": round(mae, 2), "rmse": round(rmse, 2)}
    return _demand_metrics


def predict_demand(
    province_id: int,
    days_ahead: int = 7,
    base_day_of_week: int = 0,
    base_month: int = 6,
) -> Tuple[List[Dict], Dict]:
    """
    XGBoost modeli ile günlük talep tahmini yapar.
    Dönen: (forecast_listesi, metrikler)
    """
    global _demand_model, _demand_metrics

    # Model henüz eğitilmemişse hafif bir default model yükle
    if _demand_model is None:
        _create_default_demand_model()

    forecasts = []
    for i in range(days_ahead):
        dow = (base_day_of_week + i) % 7
        month = base_month
        features = {
            "day_of_week": dow,
            "month": month,
            "is_holiday": 0,
            "weather_score": 1.0,
            "day_of_week_sin": math.sin(2 * math.pi * dow / 7),
            "day_of_week_cos": math.cos(2 * math.pi * dow / 7),
            "month_sin": math.sin(2 * math.pi * month / 12),
            "month_cos": math.cos(2 * math.pi * month / 12),
            "province_id": province_id,
        }
        X = pd.DataFrame([features])
        pred = float(_demand_model.predict(X)[0])
        noise = pred * 0.12
        forecasts.append({
            "predicted_orders": round(max(0, pred), 1),
            "confidence_low": round(max(0, pred - noise), 1),
            "confidence_high": round(pred + noise, 1),
        })

    return forecasts, _demand_metrics


def _create_default_demand_model():
    """Seed veri yokken başlangıç için basit bir model üretir."""
    global _demand_model
    np.random.seed(42)
    rows = 200
    df = pd.DataFrame({
        "day_of_week": np.random.randint(0, 7, rows),
        "month": np.random.randint(1, 13, rows),
        "is_holiday": np.random.randint(0, 2, rows),
        "weather_score": np.random.uniform(0.5, 1.0, rows),
        "province_id": np.random.randint(1, 82, rows),
        "order_count": np.random.randint(10, 300, rows).astype(float),
    })
    df = _build_demand_features(df)
    feature_cols = [
        "day_of_week", "month", "is_holiday", "weather_score",
        "day_of_week_sin", "day_of_week_cos", "month_sin", "month_cos", "province_id"
    ]
    model = XGBRegressor(n_estimators=100, max_depth=3, random_state=42, verbosity=0)
    model.fit(df[feature_cols], df["order_count"])
    _demand_model = model


# ═══════════════════════════════════════════════════════════════════
#  TESLİMAT SÜRESİ TAHMİNİ  —  Random Forest
# ═══════════════════════════════════════════════════════════════════

def train_delivery_model(history_records: List[Dict]) -> Dict:
    """
    Random Forest teslimat süresi tahmin modelini eğitir.
    """
    global _delivery_model, _delivery_metrics

    if not history_records:
        return {"mae": 0.0, "rmse": 0.0}

    df = pd.DataFrame(history_records)
    feature_cols = ["distance_km", "traffic_level", "avg_weight", "day_of_week",
                    "month", "is_holiday", "weather_score"]
    feature_cols = [c for c in feature_cols if c in df.columns]

    X = df[feature_cols].fillna(0)
    y = df["avg_delivery_hours"]

    if len(X) < 10:
        X_train, X_test, y_train, y_test = X, X, y, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=200, max_depth=6, random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(math.sqrt(mean_squared_error(y_test, preds)))

    _delivery_model = model
    _delivery_metrics = {"mae": round(mae, 2), "rmse": round(rmse, 2)}
    return _delivery_metrics


def predict_delivery_time(
    distance_km: float,
    traffic_level: float,
    weight_kg: float,
    province_id: int,
    day_of_week: int,
    hour_of_day: int,
) -> Dict:
    """
    Random Forest modeli ile tahmini teslimat süresini saat olarak döndürür.
    """
    global _delivery_model, _delivery_metrics

    if _delivery_model is None:
        _create_default_delivery_model()

    month = 6  # Sabit ayı kullan, gerekirse parametre yapılır
    features = {
        "distance_km": distance_km,
        "traffic_level": traffic_level,
        "avg_weight": weight_kg,
        "day_of_week": day_of_week,
        "month": month,
        "is_holiday": 0,
        "weather_score": 1.0 - traffic_level * 0.3,
    }
    X = pd.DataFrame([features])
    pred = float(_delivery_model.predict(X)[0])
    ci_low = round(max(0.5, pred * 0.85), 2)
    ci_high = round(pred * 1.15, 2)

    # Feature importance gösterimi
    feature_importances = dict(zip(
        features.keys(),
        _delivery_model.feature_importances_.tolist()
    ))

    return {
        "estimated_hours": round(max(0.5, pred), 2),
        "confidence_interval": [ci_low, ci_high],
        "factors": {k: round(v, 3) for k, v in feature_importances.items()},
        "metrics": _delivery_metrics,
    }


def _create_default_delivery_model():
    """Seed veri yokken basit bir delivery modeli üretir."""
    global _delivery_model
    np.random.seed(42)
    rows = 300
    df = pd.DataFrame({
        "distance_km": np.random.uniform(1, 500, rows),
        "traffic_level": np.random.uniform(0, 1, rows),
        "avg_weight": np.random.uniform(0.5, 30, rows),
        "day_of_week": np.random.randint(0, 7, rows),
        "month": np.random.randint(1, 13, rows),
        "is_holiday": np.random.randint(0, 2, rows),
        "weather_score": np.random.uniform(0.5, 1, rows),
    })
    df["avg_delivery_hours"] = (
        df["distance_km"] / 60
        + df["traffic_level"] * 3
        + df["avg_weight"] * 0.05
        + np.random.normal(0, 0.5, rows)
    ).clip(0.5, 72)

    feature_cols = ["distance_km", "traffic_level", "avg_weight",
                    "day_of_week", "month", "is_holiday", "weather_score"]
    model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
    model.fit(df[feature_cols], df["avg_delivery_hours"])
    _delivery_model = model
