from slack_sdk.web.async_client import AsyncWebClient
from .config import get_cfg
from .history import SlackCollect

_client = None

_collect = None

def get_client() -> AsyncWebClient:
    global _client
    if not _client:
        _client = AsyncWebClient(token=get_cfg().api_token)
    return _client

def get_collect() -> SlackCollect:
    global _collect
    if not _collect:
        _collect = SlackCollect(client=get_client())
    return _collect

__all__ = ["collect"]
