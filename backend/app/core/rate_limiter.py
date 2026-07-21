"""
KargoEnterprises — Sliding Window Rate Limiter
===============================================
Redis INCR + EXPIRE tabanlı rate limiting.
Redis yoksa her zaman izin verir (fail-open davranışı).
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def check_rate_limit(
    redis,
    key: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """
    Sliding window rate limiter.

    Args:
        redis:           Redis client (None ise her zaman izin verilir)
        key:             Benzersiz tanımlayıcı, örn: "rl:ai:<ip>"
        max_requests:    Pencere içindeki maksimum istek sayısı
        window_seconds:  Pencere süresi (saniye)

    Returns:
        (allowed, current_count, retry_after)
        - allowed:       True ise istek kabul edildi
        - current_count: Şu anki istek sayısı
        - retry_after:   Saniye cinsinden bekleme süresi (sadece allowed=False'da anlamlı)
    """
    if redis is None:
        return True, 0, 0

    try:
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        results = await pipe.execute()

        current_count: int = results[0]
        ttl: int = results[1]

        # İlk istek ya da TTL kaybolmuşsa pencereyi başlat
        if ttl == -1 or ttl == -2:
            await redis.expire(key, window_seconds)
            ttl = window_seconds

        if current_count > max_requests:
            retry_after = ttl if ttl > 0 else window_seconds
            logger.warning(
                f"Rate limit aşıldı: key={key}, count={current_count}/{max_requests}"
            )
            return False, current_count, retry_after

        return True, current_count, 0

    except Exception as exc:
        logger.warning(f"Rate limiter Redis hatası ({key}): {exc}")
        # Redis hatası durumunda isteğe izin ver (fail-open)
        return True, 0, 0


async def is_rate_limited(
    redis,
    identifier: str,
    prefix: str = "rl",
    max_requests: int = 20,
    window_seconds: int = 60,
) -> tuple[bool, dict]:
    """
    Kısayol fonksiyon — route handler'lardan doğrudan kullanmak için.

    Returns:
        (is_limited, headers_dict)
        - is_limited:   True ise 429 döndürülmeli
        - headers_dict: Response headers için bilgi
    """
    key = f"{prefix}:{identifier}"
    allowed, count, retry_after = await check_rate_limit(
        redis, key, max_requests, window_seconds
    )

    headers = {
        "X-RateLimit-Limit": str(max_requests),
        "X-RateLimit-Remaining": str(max(0, max_requests - count)),
        "X-RateLimit-Window": str(window_seconds),
    }
    if not allowed:
        headers["Retry-After"] = str(retry_after)

    return not allowed, headers
