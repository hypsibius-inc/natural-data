from typing import List
from llama_index.data_structs import NodeWithScore


def print_nodes_with_score(nodes_with_score: List[NodeWithScore]) -> str:
    return str([n.to_json() for n in nodes_with_score])
