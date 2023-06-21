from dataclasses import dataclass
import datetime
from typing import Optional
from .user import User
from .conversation import Conversation


@dataclass(kw_only=True)
class Message:
    text: str
    ts: datetime.datetime
    author: User
    conversation: Conversation
    post: Optional["Message"] = None
    prev_msg: Optional["Message"] = None
    next_msg: Optional["Message"] = None
