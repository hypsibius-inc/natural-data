from typing import Dict, List
from span_marker import SpanMarkerModel
from .utils import convert_to_dataset

model = SpanMarkerModel.from_pretrained(
    "tomaarsen/span-marker-xlm-roberta-large-conllpp-doc-context",
    model_max_length=2048,
    marker_max_length=512,
    entity_max_length=12,
)

def predict_last_sentence(
        sentence_with_context: str | List[str]) -> List[Dict[str, str | int | float]]:
    dataset = convert_to_dataset(sentence_with_context)
    return model.predict(dataset)
