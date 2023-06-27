from enum import IntEnum

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


def get_evidence_type(text: str) -> HeadTailOrderedDict[EvidenceTypes, float]:
    labels = dict()
    for i, score in enumerate(
        torch.nn.Softmax(1)(
            model(**tokenizer(text, return_tensors="pt").to(device)).logits
        ).tolist()[0]
    ):
        labels[EvidenceTypes(i)] = score
    return HeadTailOrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True))
