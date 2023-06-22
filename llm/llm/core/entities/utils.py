

from typing import List
from datasets import Dataset


def convert_to_dataset(document: str | List[str]) -> Dataset:
    if type(document) == str:
        document = [l.strip() for l in document.split("\n") if l.strip()]
    data_dict = {
        "tokens": [],
        "document_id": [],
        "sentence_id": [],
    }
    for sentence_id, sentence in enumerate(document):
        data_dict["document_id"].append(0)
        data_dict["sentence_id"].append(sentence_id)
        data_dict["tokens"].append(sentence)
    return Dataset.from_dict(data_dict)

