from collections import OrderedDict
from enum import IntEnum
from os.path import abspath as ap
from os.path import dirname as dn

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ..devices import device
from ..utils.listify import listify

model_path = ap(f"{dn(dn(dn(__file__)))}/models/website")

tokenizer = AutoTokenizer.from_pretrained(f"{model_path}/tokenizer/")

model = AutoModelForSequenceClassification.from_pretrained(f"{model_path}/model/").to(
    device
)

# This order should not be changed as it affects the serialization of data
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


def get_website(text: str | list) -> list[OrderedDict[Website, float]]:
    text = listify(text)
    ret = []
    for l in torch.nn.Softmax(1)(
        model(
            **tokenizer(text, padding=True, truncation=True, return_tensors="pt").to(
                device
            )
        ).logits
    ).tolist():
        labels = dict()
        for i, score in enumerate(l):
            labels[Website(i)] = score
        ret.append(
            OrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True))
        )
    return ret
