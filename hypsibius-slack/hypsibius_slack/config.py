from typing import Optional
import environ

@environ.config(prefix="SLACK")
class AppConfig:
    api_token = environ.var()

_cfg: Optional[AppConfig] = None

def get_cfg() -> AppConfig:
    global _cfg
    if not _cfg:
        _cfg = environ.to_config(AppConfig)
    return _cfg
