from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import locations, depots, couriers, orders, optimize, ai, vehicles, auth, customers, tariffs, warehouse, fleet, analytics, customer_panel, incidents, support, chatbot, live_tracking, weather, corporate, audit_log

from app.api import websockets
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Başlangıç: tabloları oluştur
    init_db()
    # Canlı takip simülasyonunu başlat
    asyncio.create_task(websockets.live_tracking_task())
    yield
    # Kapanış (opsiyonel temizleme)


app = FastAPI(
    title=settings.APP_NAME,
    description="Türkiye Kargo Bölge Optimizasyon Sistemi — FastAPI Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

from app.core.audit_middleware import AuditLogMiddleware

app.add_middleware(AuditLogMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Router kayıtları
app.include_router(auth.router, prefix="/api/auth")
app.include_router(locations.router, prefix="/api")
app.include_router(depots.router, prefix="/api")
app.include_router(couriers.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(optimize.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(tariffs.router, prefix="/api")
app.include_router(warehouse.router, prefix="/api")
app.include_router(fleet.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(customer_panel.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(support.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")
app.include_router(websockets.router, prefix="/api")
app.include_router(live_tracking.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(corporate.router, prefix="/api")
app.include_router(audit_log.router, prefix="/api")



@app.get("/", tags=["Sağlık"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Sağlık"])
def health():
    return {"status": "ok"}
