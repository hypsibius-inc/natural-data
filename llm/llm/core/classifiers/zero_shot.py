from typing import List
from ...utils.listify import listify

from transformers import pipeline

from ...utils.head_tail_ordered_dict import HeadTailOrderedDict
from ..devices import device

classifier = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
    device=device,
)


def get_label_scores(text: str | list, labels: List[str]) -> list[HeadTailOrderedDict[str, float]]:
    text = listify(text)
    output = classifier(text, labels, multi_label=True)
    return [HeadTailOrderedDict(
        sorted(
            zip(o["labels"], o["scores"]), key=lambda x: x[1], reverse=True
        )
    ) for o in output]
