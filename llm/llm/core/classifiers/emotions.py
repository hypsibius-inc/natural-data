from enum import IntEnum
from ...utils.listify import listify

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ...utils.head_tail_ordered_dict import HeadTailOrderedDict
from ..devices import device

tokenizer = AutoTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")

model = AutoModelForSequenceClassification.from_pretrained(
    "SamLowe/roberta-base-go_emotions"
).to(device)


Emotion = IntEnum(
    "Emotion",
    [
        "admiration",
        "amusement",
        "anger",
        "annoyance",
        "approval",
        "caring",
        "confusion",
        "curiosity",
        "desire",
        "disappointment",
        "disapproval",
        "disgust",
        "embarrassment",
        "excitement",
        "fear",
        "gratitude",
        "grief",
        "joy",
        "love",
        "nervousness",
        "optimism",
        "pride",
        "realization",
        "relief",
        "remorse",
        "sadness",
        "surprise",
        "neutral",
    ],
    start=0,
)


def get_emotions(text: str | list) -> HeadTailOrderedDict[Emotion, float]:
    text = listify(text)
    ret = []
    for l in torch.nn.Softmax(1)(
        model(**tokenizer(text, padding=True, truncation=True, return_tensors="pt").to(device)).logits
    ).tolist():
        labels = dict()
        for i, score in enumerate(l):
            labels[Emotion(i)] = score
        ret.append(HeadTailOrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True)))
    return ret
