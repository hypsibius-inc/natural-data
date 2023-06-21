from collections import defaultdict
from typing import Callable, Dict, List
from llama_index.data_structs import NodeWithScore, Node


def get_labels_from_nodes_with_score(nodes_with_score: List[NodeWithScore], extra_info_label_tag="label") -> Dict[str, float]:
    labels = defaultdict(float)
    for n in nodes_with_score:
        labels[n.node.extra_info[extra_info_label_tag]] += n.score / len(nodes_with_score)
    return labels

def get_label_from_nodes_with_score_custom_label_func(nodes_with_score: List[NodeWithScore], label_func: Callable[[Node], str]) -> Dict[str, float]:
    labels = defaultdict(float)
    for n in nodes_with_score:
        labels[label_func(n.node)] += n.score / len(nodes_with_score)
    return max(labels.items(), key=lambda i: i[1])[0]
