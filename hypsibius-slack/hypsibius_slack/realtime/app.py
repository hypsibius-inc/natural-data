import os
from typing import Optional
from slack_bolt.async_app import AsyncApp
from slack_bolt.adapter.socket_mode.aiohttp import AsyncSocketModeHandler


_app: Optional[AsyncApp] = None

def get_app(user_token: Optional[str] = None) -> AsyncApp:
    global _app
    if not _app:
        if not user_token:
            from ..config import get_cfg
            user_token = get_cfg().user_token
        _app = AsyncApp(token=user_token)
    return _app

async def start_app(app: Optional[AsyncApp] = None, app_token: Optional[str] = None):
    if not app:
        app = get_app()
    if not app_token:
        from ..config import get_cfg
        app_token = get_cfg().app_token
    await AsyncSocketModeHandler(app, app_token=app_token).start_async()
