import json
import os
from typing import Dict, Optional

from ..labelling.nodes_with_score_to_labels import (
    get_label_from_nodes_with_score_custom_label_func,
)
from hypsibius_slack.models import Message
from llama_index.data_structs.node import Node
from llama_index.indices.base import BaseIndex
from llama_index.retrievers import BaseRetriever
from ..core.service_context import get_service_context
from ..core.indexes.vector import (
    DEFAULT_STORAGE_LOCATION,
    create_index,
    load_index as load_vector_index,
)
from ..core.embeddings.all_mpnet_base_v2 import all_mpnet_base_v2_embed_model
from ..core.retrievers.default import get_retriever
from hypsibius_slack import get_collect
from datetime import datetime as dt

index = None
retriever: Optional[BaseRetriever] = None


def format_with_context(message: Message) -> str:
    return f"""
    At {message.ts.strftime("%c")}, @{message.author.id} said "{message.text}".
    This was said in channel "{message.conversation.name}".
    {
        f'''This was in reply to @{
            message.prev_msg.author.id
        } saying "{message.prev_msg.text}".'''
        if message.prev_msg else ""
    }{
        f'''They were both part of a larger conversation, with the topic: "{
            message.post.text
        }" created by @{message.post.author.id}.''' if message.post else ""
    }
    """.strip()


def get_message_id(m: Message) -> str:
    return f"{m.author.name}{m.ts.timestamp()}"


def get_node_id(n: Node) -> str:
    return f"{n.extra_info['author']}{n.extra_info['ts']}"


async def build_index() -> BaseIndex:
    collect = get_collect()
    global index, retriever
    nodes: Dict[str, Node] = dict()
    start = dt.now()
    print(
        f"Pulling from {len(await collect.collect_conversations())} conversations "
        f"(took {int((dt.now() - start).total_seconds())} seconds)"
    )
    async for m in collect.collect_messages():
        # relationships = dict()
        # if m.next_msg and (n := nodes.get(get_node_id(m.next_msg))):
        #     relationships[DocumentRelationship.NEXT] = n
        #     n.relationships[DocumentRelationship.PREVIOUS] = m
        # if m.prev_msg and (n := nodes.get(get_node_id(m.prev_msg))):
        #     relationships[DocumentRelationship.PREVIOUS] = n
        #     n.relationships[DocumentRelationship.NEXT] = m
        # if m.post:
        #     relationships[DocumentRelationship.PARENT] = nodes[get_node_id(m.post)]
        nodes[get_message_id(m)] = Node(
            doc_id=get_message_id(m),
            text=format_with_context(m),
            extra_info={
                "text": m.text,
                "author": m.author.name,
                "conversation": m.conversation.name,
                "ts": m.ts.timestamp(),
            },
            # relationships=relationships,
        )
        if (count := len(nodes)) % 100 == 0:
            print(
                f"Collected {count} messages in {int((dt.now() - start).total_seconds())} seconds"
            )

    print(
        f"Creating index with {len(nodes)} nodes (took {int((dt.now() - start).total_seconds())} seconds)"
    )
    index_start = dt.now()
    index = create_index(
        list(nodes.values()),
        get_service_context(embed_model=all_mpnet_base_v2_embed_model),
    )
    print(
        f"Index creation took {int((dt.now() - index_start).total_seconds())} seconds"
    )
    retriever = get_retriever(index, 5)
    return index


def load_index() -> BaseIndex:
    global index, retriever
    index = load_vector_index(
        get_service_context(embed_model=all_mpnet_base_v2_embed_model)
    )
    retriever = get_retriever(index, 5)
    return index


_labels: Optional[Dict[str, str]] = None


def load_labels() -> Dict[str, str]:
    global _labels
    if not _labels:
        with open(os.path.join(DEFAULT_STORAGE_LOCATION, "labels.json")) as f:
            _labels = json.load(f)
    return _labels


async def listen():
    from hypsibius_slack.realtime.messages import add_callback, MessageType
    from hypsibius_slack.realtime.app import start_app

    labels = load_labels()
    load_index()

    async def handle_new_message(m):
        print(f"At {m.ts}, {m.user} sent a message in {m.channel}, saying: {m.text}")
        return f"""At {m.ts}, {m.user} sent a message in {m.channel}, labeled '{
            get_label_from_nodes_with_score_custom_label_func(
                retriever.retrieve(m.text),
                lambda n: labels[get_node_id(n)],
            )}', saying: {m.text}"""

    async def handle_message_update(m):
        print("Updated message")
        return f"""At {m.ts}, {m.message['user']} edited a message in {m.channel}, labeled '{
            get_label_from_nodes_with_score_custom_label_func(
                retriever.retrieve(m.message['text']),
                lambda n: labels[get_node_id(n)],
            )}', that says: {m.message['text']}"""

    async def handle_message_delete(m):
        print(f"Deleted message {m.deleted_ts}")

    add_callback(handle_new_message, message_type=MessageType.NEW)
    add_callback(handle_message_update, message_type=MessageType.UPDATED)
    add_callback(handle_message_delete, message_type=MessageType.DELETED)
    await start_app()


__all__ = ["index", "retriever", "build_index", "load_index", "format_with_context"]
