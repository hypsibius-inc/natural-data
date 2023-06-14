from .core.gpt4all import service_context

print(service_context.llm_predictor.get_llm_metadata())
