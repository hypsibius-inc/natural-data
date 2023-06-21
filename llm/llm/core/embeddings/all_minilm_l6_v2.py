from llama_index import LangchainEmbedding
from langchain.embeddings.huggingface import HuggingFaceEmbeddings


all_MiniLM_L6_v2_embed_model = LangchainEmbedding(
    HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
)

__all__ = ["all_MiniLM_L6_v2_embed_model"]


