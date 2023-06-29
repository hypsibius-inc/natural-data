from enum import IntEnum
from ...utils.listify import listify

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ...utils.head_tail_ordered_dict import HeadTailOrderedDict
from ..devices import device

tokenizer = AutoTokenizer.from_pretrained("marieke93/MiniLM-evidence-types")

model = AutoModelForSequenceClassification.from_pretrained(
    "marieke93/MiniLM-evidence-types"
).to(device)


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


def get_evidence_type(text: str | list) -> HeadTailOrderedDict[EvidenceTypes, float]:
    text = listify(text)
    ret = []
    for l in torch.nn.Softmax(1)(
        model(**tokenizer(text, padding=True, truncation=True, return_tensors="pt").to(device)).logits
    ).tolist():
        labels = dict()
        for i, score in enumerate(l):
            labels[EvidenceTypes(i)] = score
        ret.append(HeadTailOrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True)))
    return ret
