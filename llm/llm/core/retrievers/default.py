from llama_index.indices.base import BaseIndex
from llama_index.retrievers import BaseRetriever


def get_retriever(index: BaseIndex, similarity_top_k: int = 5) -> BaseRetriever:
    return index.as_retriever(similarity_top_k=similarity_top_k)
