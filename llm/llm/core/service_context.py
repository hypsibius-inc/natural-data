from llama_index import LLMPredictor, PromptHelper, ServiceContext
from llama_index.llm_predictor.base import BaseLLMPredictor
from llama_index.embeddings.base import BaseEmbedding
from llama_index.langchain_helpers.text_splitter import TokenTextSplitter
from llama_index.node_parser.simple import SimpleNodeParser

prompt_helper = PromptHelper(
    max_input_size=512, num_output=256, max_chunk_overlap=-1000
)


def get_service_context(
    embed_model: BaseEmbedding,
    llm_predictor: BaseLLMPredictor = LLMPredictor(
        True
    ),  # This default is to override the necessity of an LLM predictor
) -> ServiceContext:
    return ServiceContext.from_defaults(
        chunk_size=512,
        llm_predictor=llm_predictor,
        embed_model=embed_model,
        prompt_helper=prompt_helper,
        node_parser=SimpleNodeParser(
            text_splitter=TokenTextSplitter(chunk_size=300, chunk_overlap=20)
        ),
    )
