from typing import Dict
from hypsibius_slack.models import Message
from llama_index.data_structs.node import Node
from ..core.service_context import get_service_context
from ..core.indexes.vector import create_index, load_index as load_vector_index
from ..core.embeddings.all_mpnet_base_v2 import all_mpnet_base_v2_embed_model
from ..core.retrievers.default import get_retriever
from hypsibius_slack import get_collect
from datetime import datetime as dt

index = None
retriever = None


def format_with_context(message: Message) -> str:
    return f"""
    At {message.ts.strftime("%c")}, {message.author.name} said "{message.text}".
    This was said in {message.conversation.name}.
    {
        f'''This was in reply to {
            message.prev_msg.author.name
        } saying "{message.prev_msg.text}".'''
        if message.prev_msg else ""
    }{
        f'''They were both part of a larger conversation, with the topic: "{
            message.post.text
        }" created by {message.post.author.name}.''' if message.post else ""
    }
    """


def get_node_id(m: Message) -> str:
    return f"{m.author.name}{m.ts.timestamp()}"


async def build_index():
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
        nodes[get_node_id(m)] = Node(
            doc_id=get_node_id(m),
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


def load_index():
    global index, retriever
    index = load_vector_index(
        get_service_context(embed_model=all_mpnet_base_v2_embed_model)
    )
    retriever = get_retriever(index, 5)


__all__ = ["index", "retriever", "build_index", "load_index", "format_with_context"]
