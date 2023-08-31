def listify(param: str | list) -> list:
    if hasattr(param, "capitalize"):
        return [param]
    return param
