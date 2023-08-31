from flask import Flask, request, jsonify
from pydantic import BaseModel

from .classifiers import classify

application = Flask(__name__)


class RequestDataOptions(BaseModel):
    classifiers: list[str] | None = None


class RequestData(BaseModel):
    text: list[str]
    zero_shot_labels: list[str] = []
    options: RequestDataOptions | None = None


@application.post("/")
def index():
    print("Entered!")
    data = RequestData(
        **request.json
    )
    return jsonify(
        [
            c.model_dump(mode="json")
            for c in classify(
                data.text,
                data.zero_shot_labels,
                data.options.classifiers if data.options else None,
            )
        ]
    )


@application.get("/health/readiness")
def readiness():
    return ("ok", 200)


@application.get("/health/liveness")
def liveness():
    return ("ok", 200)


if __name__ == "__main__":
    application.run()
