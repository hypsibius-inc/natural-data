from collections import defaultdict
import datetime
from typing import Dict, List, Optional
from llama_index import VectorStoreIndex
from llama_index.data_structs.node import Node
from sklearn.base import ClusterMixin
import numpy as np


def cluster(
    index: VectorStoreIndex, model: Optional[ClusterMixin] = None
) -> Dict[int, Node]:
    if not model:
        from .sklearn_optics import model as optics_model

        model = optics_model
    vectors = list(index.vector_store.to_dict()["embedding_dict"].items())
    vector_data = np.array([v[1] for v in vectors])
    start = datetime.datetime.now()
    labels = model.fit_predict(vector_data)
    ret = defaultdict(list)
    for i, l in enumerate(labels):
        ret[l].append(index.docstore.get_node(vectors[i][0]))
    print(f"""Clustered into {len(ret)-1} clusters in {
        int((datetime.datetime.now() - start).total_seconds())
        } seconds, with {len(ret[-1])} outliers""")
    return ret
