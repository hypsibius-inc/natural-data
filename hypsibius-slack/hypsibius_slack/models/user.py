from dataclasses import dataclass
from typing import Optional

from .team import Team


@dataclass(kw_only=True, frozen=True)
class User:
    id: str
    team: Team
    deleted: bool
    display_name: str
    name: str
    email: Optional[str] = None
    status: Optional[str] = None
