from collections import OrderedDict
from dataclasses import dataclass
from typing import List
from .emotions import Emotion, get_emotions
from .evidence_types import EvidenceTypes, get_evidence_type
from .website_classification import Website, get_website
from .zero_shot import get_label_scores


@dataclass(frozen=True)
class Classification:
    text: str
    emotions: OrderedDict[Emotion, float]
    evidence: OrderedDict[EvidenceTypes, float]
    website: OrderedDict[Website, float]
    labels: OrderedDict[str, float]


def classify(text: str, labels: List[str]) -> Classification:
    return Classification(
        text=text,
        emotions=get_emotions(text),
        website=get_website(text),
        evidence=get_evidence_type(text),
        labels=get_label_scores(text, labels)
    )
