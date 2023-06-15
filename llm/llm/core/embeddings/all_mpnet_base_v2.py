from llama_index import LangchainEmbedding
from langchain.embeddings.huggingface import HuggingFaceEmbeddings


all_mpnet_base_v2_embed_model = LangchainEmbedding(
    HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
)

__all__ = ["all_mpnet_base_v2_embed_model"]
