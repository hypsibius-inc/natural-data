from langchain.llms import GPT4All
from llama_index import LLMPredictor

local_llm_path = "/home/jonirap/work/hypsibius/code/natural-data/llm/llm/core/ggml-gpt4all-j-v1.3-groovy.bin"
llm = GPT4All(model=local_llm_path, backend="gptj", streaming=True, n_ctx=512)
llm_predictor = LLMPredictor(llm=llm)
