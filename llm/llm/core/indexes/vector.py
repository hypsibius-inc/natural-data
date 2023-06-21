from typing import Sequence

from llama_index import (ServiceContext, StorageContext, VectorStoreIndex,
                         load_index_from_storage)
from llama_index.data_structs.node import Node

DEFAULT_STORAGE_LOCATION = "./storage"


def create_index(nodes: Sequence[Node], service_context: ServiceContext, storage_location=DEFAULT_STORAGE_LOCATION):
    index = VectorStoreIndex(nodes, service_context=service_context)
    index.storage_context.persist(persist_dir=storage_location)
    return index


def load_index(service_context: ServiceContext, storage_location=DEFAULT_STORAGE_LOCATION):
    storage_context = StorageContext.from_defaults(persist_dir=storage_location)
    return load_index_from_storage(storage_context, service_context=service_context)
