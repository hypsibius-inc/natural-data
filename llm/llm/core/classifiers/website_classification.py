from enum import IntEnum

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ...utils.head_tail_ordered_dict import HeadTailOrderedDict

tokenizer = AutoTokenizer.from_pretrained("alimazhar-110/website_classification")

model = AutoModelForSequenceClassification.from_pretrained(
    "alimazhar-110/website_classification"
)


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


def get_website(text: str) -> HeadTailOrderedDict[Website, float]:
    labels = dict()
    for i, score in enumerate(
        torch.nn.Softmax(1)(
            model(**tokenizer(text, return_tensors="pt")).logits
        ).tolist()[0]
    ):
        labels[Website(i)] = score
    return HeadTailOrderedDict(sorted(labels.items(), key=lambda x: x[1], reverse=True))
