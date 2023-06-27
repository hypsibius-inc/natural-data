from dataclasses import dataclass
from typing import Sequence

from ...utils.head_tail_ordered_dict import HeadTailOrderedDict
from .emotions import Emotion, get_emotions
from .evidence_types import EvidenceTypes, get_evidence_type
from .website_classification import Website, get_website
from .zero_shot import get_label_scores


@dataclass(frozen=True)
class Classification:
    text: str
    emotions: HeadTailOrderedDict[Emotion, float]
    evidence: HeadTailOrderedDict[EvidenceTypes, float]
    website: HeadTailOrderedDict[Website, float]
    labels: HeadTailOrderedDict[str, float]

    def __repr__(self) -> str:
        return str(self)

    def __str__(self) -> str:
        return f"""
Classification of "{self.text}"
Top Websites: {list(self.website.head().items())}
Top Emotions: {list(self.emotions.head().items())}
Top Evidence: {list(self.evidence.head().items())}
Top Labels: {list(self.labels.head().items())}
        """.strip()


def classify(
    text: str,
    labels: Sequence[str] = (
        "urgent",
        "cyber security",
        "physical danger",
        "small talk",
        "management",
        "company",
        "sales",
        "marketing",
        "HR (human resources)",
        "update",
        "question",
        "development",
    ),
) -> Classification:
    return Classification(
        text=text,
        emotions=get_emotions(text),
        website=get_website(text),
        evidence=get_evidence_type(text),
        labels=get_label_scores(text, labels),
    )
