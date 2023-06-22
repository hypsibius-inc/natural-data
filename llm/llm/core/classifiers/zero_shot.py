from typing import List

from transformers import pipeline

from ...utils.head_tail_ordered_dict import HeadTailOrderedDict

classifier = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
)


def get_label_scores(text: str, labels: List[str]) -> HeadTailOrderedDict[str, float]:
    output = classifier(text, labels, multi_label=True)
    return HeadTailOrderedDict(
        sorted(
            zip(output["labels"], output["scores"]), key=lambda x: x[1], reverse=True
        )
    )
