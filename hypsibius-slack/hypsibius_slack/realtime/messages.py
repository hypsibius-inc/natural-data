import abc
from collections import namedtuple
import itertools
from slack_bolt.async_app import AsyncApp
from enum import Enum
from typing import Any, Awaitable, Callable, Dict, List, Optional, Union


class MessageType(Enum):
    NEW = "NEW"
    UPDATED = "UPDATED"
    DELETED = "DELETED"


_message_subtypes: Dict[MessageType, List[str]] = {
    MessageType.NEW: [None],
    MessageType.UPDATED: ["message_changed"],
    MessageType.DELETED: ["message_deleted"],
}


def add_callback(
    callback: Callable[[Dict[str, Union[str, Dict[str, str]]]], Awaitable[Optional[str]]],
    app: Optional[AsyncApp] = None,
    message_type: MessageType = MessageType.NEW,
):
    if not app:
        from .app import get_app

        app = get_app()
    for subtype in _message_subtypes[message_type]:

        @app.event({"type": "message", "subtype": subtype})
        async def _(payload: Dict[str, Union[str, Dict[str, str]]]):
            response = await callback(namedtuple("Message", list(payload.keys()))(
                **payload
            ))
            if response:
                from ..app import get_bot_client

                await get_bot_client().chat_postMessage(
                    channel=payload.get("user") or payload.get("message").get("user"), text=response
                )
