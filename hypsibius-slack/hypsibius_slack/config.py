import environ

@environ.config(prefix="SLACK")
class AppConfig:
    api_token = environ.var()

cfg: AppConfig = environ.to_config(AppConfig)
