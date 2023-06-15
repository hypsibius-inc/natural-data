from collections import defaultdict
from typing import Dict, List
from llama_index.data_structs import NodeWithScore


def get_labels_from_nodes_with_score(nodes_with_score: List[NodeWithScore], extra_info_label_tag="label") -> Dict[str, float]:
    labels = defaultdict(float)
    for n in nodes_with_score:
        labels[n.node.extra_info[extra_info_label_tag]] += n.score / len(nodes_with_score)
    return labels
