from typing import Optional
import environ

@environ.config(prefix="SLACK")
class AppConfig:
    user_token = environ.var()
    bot_token = environ.var()
    app_token = environ.var()

_cfg: Optional[AppConfig] = None

def get_cfg() -> AppConfig:
    global _cfg
    if not _cfg:
        _cfg = environ.to_config(AppConfig)
    return _cfg
