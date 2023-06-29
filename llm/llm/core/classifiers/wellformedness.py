from ...utils.listify import listify
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from ..devices import device

tokenizer = AutoTokenizer.from_pretrained("salesken/query_wellformedness_score")

model = AutoModelForSequenceClassification.from_pretrained(
    "salesken/query_wellformedness_score"
).to(device)


def get_score(text: str | list) -> float:
    return [s[0] for s in model(**tokenizer(listify(text), padding=True, truncation=True, return_tensors="pt").to(device)).logits.tolist()]
