from os.path import abspath as ap
from os.path import dirname as dn

from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ..devices import device
from ..utils.listify import listify

model_path = ap(f"{dn(dn(dn(__file__)))}/models/wellformed")

tokenizer = AutoTokenizer.from_pretrained(
    f"{model_path}/tokenizer/"
)

model = AutoModelForSequenceClassification.from_pretrained(f"{model_path}/model/").to(
    device
)


def get_score(text: str | list) -> float:
    return [
        s[0]
        for s in model(
            **tokenizer(
                listify(text), padding=True, truncation=True, return_tensors="pt"
            ).to(device)
        ).logits.tolist()
    ]
