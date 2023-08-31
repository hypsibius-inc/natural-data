from collections import OrderedDict
from os.path import abspath as ap
from os.path import dirname as dn
from typing import List

from transformers import pipeline

from ..devices import device
from ..utils.listify import listify

model_path = ap(f"{dn(dn(dn(__file__)))}/models/zeroshot/")

classifier = pipeline(
    "zero-shot-classification",
    model=model_path,
    device=device,
)


def get_label_scores(
    text: str | list, labels: List[str]
) -> list[OrderedDict[int, float]]:
    text = listify(text)
    output = classifier(text, labels, multi_label=True)
    return [
        OrderedDict(
            sorted(
                zip([labels.index(l) for l in o["labels"]], o["scores"]),
                key=lambda x: x[1],
                reverse=True,
            )
        )
        for o in output
    ]
