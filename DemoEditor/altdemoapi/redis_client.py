import os
from redis.asyncio import Redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

async def init_redis(app):
    """Initialize a Redis client and attach it to app.state.redis"""
    client = Redis.from_url(REDIS_URL, decode_responses=True)
    # attach to FastAPI app state for reuse
    app.state.redis = client

async def close_redis(app):
    client = getattr(app.state, "redis", None)
    if client is not None:
        await client.close()
        app.state.redis = None
