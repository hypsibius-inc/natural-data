from typing import AsyncIterable
from slack_sdk.web.async_client import AsyncWebClient
from .config import cfg
from .history import SlackCollect

client = AsyncWebClient(token=cfg.api_token)

collect = SlackCollect(client=client)

__all__ = ["collect"]
