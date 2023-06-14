from langchain.embeddings.huggingface import HuggingFaceEmbeddings
from langchain.llms import GPT4All, Writer
from llama_index import (
    LangchainEmbedding,
    LLMPredictor,
    PromptHelper,
    ServiceContext,
)
from llama_index.langchain_helpers.text_splitter import TokenTextSplitter
from llama_index.node_parser.simple import SimpleNodeParser

local_llm_path = "/home/jonirap/work/hypsibius/code/natural-data/llm/llm/core/ggml-gpt4all-j-v1.3-groovy.bin"
llm = GPT4All(model=local_llm_path, backend="gptj", streaming=True, n_ctx=512)
print(llm.to_json())
llm_predictor = LLMPredictor(llm=llm)

embed_model = LangchainEmbedding(
    HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
)

prompt_helper = PromptHelper(
    max_input_size=512, num_output=256, max_chunk_overlap=-1000
)
service_context = ServiceContext.from_defaults(
    llm_predictor=llm_predictor,
    embed_model=embed_model,
    prompt_helper=prompt_helper,
    node_parser=SimpleNodeParser(
        text_splitter=TokenTextSplitter(chunk_size=300, chunk_overlap=20)
    ),
)
