from collections import OrderedDict
from enum import IntEnum
from os.path import abspath as ap
from os.path import dirname as dn

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ..devices import device
from ..utils.listify import listify

model_path = ap(f"{dn(dn(dn(__file__)))}/models/evidence")

tokenizer = AutoTokenizer.from_pretrained(f"{model_path}/tokenizer/")

model = AutoModelForSequenceClassification.from_pretrained(f"{model_path}/model/").to(
    device
)


# This order should not be changed as it affects the serialization of data
EvidenceTypes = IntEnum(
    "EvidenceTypes",
    [
        "Anecdote",
        "Assumption",
        "Definition",
        "Null",
        "Other",
        "Statistics",
        "Testimony",
    ],
    start=0,
)


def get_evidence_type(text: str | list) -> OrderedDict[EvidenceTypes, float]:
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
            labels[EvidenceTypes(i)] = score
        ret.append(
            OrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True))
        )
    return ret
