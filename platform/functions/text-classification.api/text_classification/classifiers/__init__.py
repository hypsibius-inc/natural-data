from typing import OrderedDict, Sequence

from pydantic import BaseModel

from ..utils.head_tail_ordered_dict import head, tail
from ..utils.listify import listify
from .emotions import Emotion, get_emotions
from .evidence_types import EvidenceTypes, get_evidence_type
from .website_classification import Website, get_website
from .wellformedness import get_score
from .zero_shot import get_label_scores


class Classification(BaseModel):
    emotions: OrderedDict[Emotion, float] | None
    evidence_types: OrderedDict[EvidenceTypes, float] | None
    websites: OrderedDict[Website, float] | None
    zero_shot: OrderedDict[int, float] | None
    wellformedness: float | None

    def __repr__(self) -> str:
        return str(self)

    def __str__(self) -> str:
        return (
            f"""Classification of '{self.text}'"""
            + (
                f"\nTop Websites: {list(self.websites.head().items())}"
                if self.websites
                else ""
            )
            + (
                f"\nTop Emotions: {list(self.emotions.head().items())}"
                if self.emotions
                else ""
            )
            + (
                f"\nTop Evidence: {list(self.evidence_types.head().items())}"
                if self.evidence_types
                else ""
            )
            + (
                f"\nTop Labels: {list(self.zero_shot.head().items())}"
                if self.zero_shot
                else ""
            )
            + (
                f"\nWellformedness: {self.wellformedness}"
                if self.wellformedness
                else ""
            )
        ).strip()


_default_labels = (
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
)


def classify(
    text: str | list,
    labels: Sequence[str] | None = None,
    classifiers: Sequence[str] | None = None,
) -> list[Classification]:
    labels = labels or _default_labels
    text = listify(text)
    emotions = (
        get_emotions(text) if classifiers is None or "emotions" in classifiers else None
    )
    website = (
        get_website(text) if classifiers is None or "websites" in classifiers else None
    )
    evidence = (
        get_evidence_type(text)
        if classifiers is None or "evidence_types" in classifiers
        else None
    )
    label_scores = (
        get_label_scores(text, labels)
        if classifiers is None or "zero_shot" in classifiers
        else None
    )
    wellformedness = (
        get_score(text)
        if classifiers is None or "wellformedness" in classifiers
        else None
    )
    return [
        Classification(
            emotions=emotions[i]
            if classifiers is None or "emotions" in classifiers
            else None,
            websites=website[i]
            if classifiers is None or "websites" in classifiers
            else None,
            evidence_types=evidence[i]
            if classifiers is None or "evidence_types" in classifiers
            else None,
            zero_shot=label_scores[i]
            if classifiers is None or "zero_shot" in classifiers
            else None,
            wellformedness=wellformedness[i]
            if classifiers is None or "wellformedness" in classifiers
            else None,
        )
        for i, _ in enumerate(text)
    ]
