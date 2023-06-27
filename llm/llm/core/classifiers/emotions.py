from enum import IntEnum

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


def get_emotions(text: str) -> HeadTailOrderedDict[Emotion, float]:
    labels = dict()
    for i, score in enumerate(
        torch.nn.Softmax(1)(
            model(**tokenizer(text, return_tensors="pt").to(device)).logits
        ).tolist()[0]
    ):
        labels[Emotion(i)] = score
    return HeadTailOrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True))
