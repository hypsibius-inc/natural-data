from slack_sdk.web.async_client import AsyncWebClient
from .config import get_cfg
from .history import SlackCollect

_user_client = None
_bot_client = None

_collect = None

def get_user_client() -> AsyncWebClient:
    global _user_client
    if not _user_client:
        _user_client = AsyncWebClient(token=get_cfg().user_token)
    return _user_client

def get_bot_client() -> AsyncWebClient:
    global _bot_client
    if not _bot_client:
        _bot_client = AsyncWebClient(token=get_cfg().bot_token)
    return _bot_client

def get_collect() -> SlackCollect:
    global _collect
    if not _collect:
        _collect = SlackCollect(client=get_user_client())
    return _collect

__all__ = ["collect"]
