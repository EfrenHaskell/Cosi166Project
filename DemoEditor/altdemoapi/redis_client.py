import os
from redis.asyncio import Redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

async def init_redis(app):
    """Initialize a Redis client and attach it to app.state.redis"""
    try:
        client = Redis.from_url(REDIS_URL, decode_responses=True)
        # Test the connection
        await client.ping()
        app.state.redis = client
        print("✓ Redis connected successfully")
    except Exception as e:
        print(f"Redis unavailable ({type(e).__name__}): using in-memory fallback")
        app.state.redis = None

async def close_redis(app):
    client = getattr(app.state, "redis", None)
    if client is not None:
        await client.close()
        app.state.redis = None
