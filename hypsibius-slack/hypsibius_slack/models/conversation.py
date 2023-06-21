from dataclasses import dataclass
import datetime
from .user import User


@dataclass(frozen=True, kw_only=True)
class Conversation:
    id: str
    name: str
    created: datetime.datetime
    creator: User
    is_private: bool
