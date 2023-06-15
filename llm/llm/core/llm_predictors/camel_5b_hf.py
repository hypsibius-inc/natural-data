import logging
import sys
from llama_index.prompts.prompts import SimpleInputPrompt
from llama_index import ServiceContext, SimpleDirectoryReader, VectorStoreIndex, LangchainEmbedding
from llama_index.llm_predictor import HuggingFaceLLMPredictor

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler(stream=sys.stdout))


# This will wrap the default prompts that are internal to llama-index
# taken from https://huggingface.co/Writer/camel-5b-hf
query_wrapper_prompt = SimpleInputPrompt(
    "Below is an instruction that describes a task. "
    "Write a response that appropriately completes the request.\n\n"
    "### Instruction:\n{query_str}\n\n### Response:"
)

camel_5b_hf_predictor = HuggingFaceLLMPredictor(
    max_input_size=2048,
    max_new_tokens=256,
    generate_kwargs={"temperature": 0.01, "do_sample": False},
    query_wrapper_prompt=query_wrapper_prompt,
    tokenizer_name="Writer/camel-5b-hf",
    model_name="Writer/camel-5b-hf",
    device_map="auto",
    tokenizer_kwargs={"max_length": 2048},
    # uncomment this if using CUDA to reduce memory usage
    # model_kwargs={"torch_dtype": torch.float16}
    model_kwargs={"offload_folder": "offload"},
)

__all__ = ["camel_5b_hf_predictor"]

