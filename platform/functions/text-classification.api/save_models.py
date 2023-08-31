from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

# Emotions
emotionsTokenizer = AutoTokenizer.from_pretrained("SamLowe/roberta-base-go_emotions")
emotionsModel = AutoModelForSequenceClassification.from_pretrained(
    "SamLowe/roberta-base-go_emotions"
)
emotionsTokenizer.save_pretrained("models/emotions/tokenizer")
emotionsModel.save_pretrained("models/emotions/model")

# EvidenceTypes
evidenceTokenizer = AutoTokenizer.from_pretrained("marieke93/MiniLM-evidence-types")
evidenceModel = AutoModelForSequenceClassification.from_pretrained(
    "marieke93/MiniLM-evidence-types"
)
evidenceTokenizer.save_pretrained("models/evidence/tokenizer")
evidenceModel.save_pretrained("models/evidence/model")

# Website
websiteTokenizer = AutoTokenizer.from_pretrained("alimazhar-110/website_classification")
websiteModel = AutoModelForSequenceClassification.from_pretrained(
    "alimazhar-110/website_classification"
)
websiteTokenizer.save_pretrained("models/website/tokenizer")
websiteModel.save_pretrained("models/website/model")

# Wellformedness
wellformedTokenizer = AutoTokenizer.from_pretrained("salesken/query_wellformedness_score")
wellformedModel = AutoModelForSequenceClassification.from_pretrained(
    "salesken/query_wellformedness_score"
)
wellformedTokenizer.save_pretrained("models/wellformed/tokenizer")
wellformedModel.save_pretrained("models/wellformed/model")

# Zero Shot
classifier = pipeline(
    "zero-shot-classification",
    model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli",
)
classifier.save_pretrained("models/zeroshot/")

