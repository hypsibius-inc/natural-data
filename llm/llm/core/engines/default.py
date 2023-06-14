from llama_index.indices.base import BaseIndex
from llama_index.chat_engine.types import BaseChatEngine


def get_engine(index: BaseIndex) -> BaseChatEngine:
    return index.as_chat_engine(service_context=index.service_context)
