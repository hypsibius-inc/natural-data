from dataclasses import dataclass
from typing import Optional

@dataclass(kw_only=True, frozen=True)
class Team:
    id: str
    name: str
    domain: str
    email_domain: str
