"""
KargoEnterprises — Redis / Memurai Bağlantı Yöneticisi
========================================================
Async Redis client (redis.asyncio).
Memurai çalışmıyorsa sistem yine de çalışmaya devam eder (graceful fallback).
"""

import logging
from typing import Optional

import redis.asyncio as aioredis
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff

from app.core.config import settings

logger = logging.getLogger(__name__)

# Singleton bağlantı nesnesi
_redis_client: Optional[aioredis.Redis] = None
# Bağlantı başarısız olduğunda flag — başarısız bağlantıyı tekrar tekrar denememek için
_connection_failed: bool = False


async def get_redis_client() -> Optional[aioredis.Redis]:
    """
    Singleton async Redis client döndürür.
    Bağlantı başarısızsa None döner — sistem çalışmaya devam eder.
    Başarısız bağlantı tekrar tekrar denenmez (her request'te timeout beklenmez).
    """
    global _redis_client, _connection_failed

    if not settings.REDIS_ENABLED:
        return None

    # Daha önce bağlantı başarısız olduysa tekrar deneme
    if _connection_failed:
        return None

    if _redis_client is not None:
        return _redis_client

    try:
        retry = Retry(ExponentialBackoff(), 3)
        client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry=retry,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        # Bağlantıyı test et
        await client.ping()
        _redis_client = client
        _connection_failed = False
        logger.info(f"✅ Redis/Memurai bağlantısı kuruldu: {settings.REDIS_URL}")
    except Exception as exc:
        _connection_failed = True
        logger.warning(
            f"⚠️  Redis/Memurai bağlantısı kurulamadı ({exc}). "
            "Cache ve rate limiting devre dışı, sistem normal çalışmaya devam ediyor."
        )
        return None

    return _redis_client


async def close_redis():
    """Uygulama kapanırken bağlantıyı kapat."""
    global _redis_client, _connection_failed
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis bağlantısı kapatıldı.")
    # Restart sonrası yeniden bağlanabilmek için flag'i sıfırla
    _connection_failed = False


# ─── FastAPI Depends() ile kullanım ──────────────────────────────────────────
async def get_redis():
    """
    FastAPI dependency injection için generator.
    Kullanım: redis = Depends(get_redis)
    """
    client = await get_redis_client()
    try:
        yield client
    finally:
        pass  # Singleton — kapatmıyoruz


# ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
async def redis_get(key: str) -> Optional[str]:
    """Key değerini al. Redis yoksa None döner."""
    client = await get_redis_client()
    if not client:
        return None
    try:
        return await client.get(key)
    except Exception as exc:
        logger.warning(f"Redis GET hatası ({key}): {exc}")
        return None


async def redis_set(key: str, value: str, ttl_seconds: int = 300) -> bool:
    """Key değerini TTL ile kaydet. Başarı durumunu döner."""
    client = await get_redis_client()
    if not client:
        return False
    try:
        await client.setex(key, ttl_seconds, value)
        return True
    except Exception as exc:
        logger.warning(f"Redis SET hatası ({key}): {exc}")
        return False


async def redis_delete(key: str) -> bool:
    """Key'i sil."""
    client = await get_redis_client()
    if not client:
        return False
    try:
        await client.delete(key)
        return True
    except Exception as exc:
        logger.warning(f"Redis DEL hatası ({key}): {exc}")
        return False


async def redis_exists(key: str) -> bool:
    """Key var mı kontrol et."""
    client = await get_redis_client()
    if not client:
        return False
    try:
        return bool(await client.exists(key))
    except Exception as exc:
        logger.warning(f"Redis EXISTS hatası ({key}): {exc}")
        return False
