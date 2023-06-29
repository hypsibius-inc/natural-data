from enum import IntEnum
from ...utils.listify import listify

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ...utils.head_tail_ordered_dict import HeadTailOrderedDict
from ..devices import device

tokenizer = AutoTokenizer.from_pretrained("alimazhar-110/website_classification")

model = AutoModelForSequenceClassification.from_pretrained(
    "alimazhar-110/website_classification"
).to(device)


Website = IntEnum(
    "Website",
    [
        "Travel",
        "SocialNetworkingAndMessaging",
        "News",
        "StreamingServices",
        "Sports",
        "Photography",
        "LawAndGovernment",
        "HealthAndFitness",
        "Games",
        "ECommerce",
        "Forums",
        "Food",
        "Education",
        "ComputersAndTechnology",
        "BusinessOrCorporate",
        "Adult",
    ],
    start=0,
)


def get_website(text: str | list) -> list[HeadTailOrderedDict[Website, float]]:
    text = listify(text)
    ret = []
    for l in torch.nn.Softmax(1)(
        model(**tokenizer(text, padding=True, truncation=True, return_tensors="pt").to(device)).logits
    ).tolist():
        labels = dict()
        for i, score in enumerate(l):
            labels[Website(i)] = score
        ret.append(HeadTailOrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True)))
    return ret
