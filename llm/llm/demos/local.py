from llama_index.data_structs.node import Node
from ..labelling.nodes_with_score_to_labels import get_labels_from_nodes_with_score
from ..utils.print_node_score import print_nodes_with_score
from ..core.service_context import get_service_context
from ..core.engines.default import get_engine
from ..core.indexes.vector import create_index
from ..core.embeddings.all_mpnet_base_v2 import all_mpnet_base_v2_embed_model
from ..core.retrievers.default import get_retriever

nodes = [
    Node(
        text="Tel Aviv was the most expensive city in the world according to the economist in 2022",
        doc_id="tlv_2022",
        extra_info={"label": "cities"},
    ),
    Node(
        text="New York was the most expensive city in the world according to the economist in 2023",
        doc_id="nyc_2023",
        extra_info={"label": "cities"},
    ),
    Node(
        text="Jonathan Rapoport is the developer of this package",
        doc_id="jr_d",
        extra_info={"label": "personal"},
    ),
    Node(
        text="Jonathan Rapoport is the creator of the content this chat is based on",
        doc_id="jr_c",
        extra_info={"label": "personal"},
    ),
    Node(
        text="Jonathan Rapoport is the CTO of Hypsibius",
        doc_id="jr_cto",
        extra_info={"label": "hypsibius-staff"},
    ),
    Node(
        text="Saskia Hoffmann is the CEO of Hypsibius",
        doc_id="sh_ceo",
        extra_info={"label": "hypsibius-staff"},
    ),
    Node(
        text="Hypsibius was founded in May 2023 by Jonathan Rapoport and Saskia Hoffmann",
        doc_id="hs_f",
        extra_info={"label": "hypsibius-history"},
    ),
    Node(
        text="""Hypsibius hasn't yet raised any capital""",
        doc_id="hs_vc",
        extra_info={"label": "hypsibius-history"},
    ),
    Node(
        text="Hypsibius' offices will be in San Francisco and Tel Aviv",
        doc_id="hs_o",
        extra_info={"label": "hypsibius-future"},
    ),
    Node(
        text="Hypsibius will get funding from VCs in 2023, hopefully",
        doc_id="hs_ff",
        extra_info={"label": "hypsibius-future"},
    ),
]

index = create_index(
    nodes, get_service_context(embed_model=all_mpnet_base_v2_embed_model)
)
engine = get_engine(index)
retriever = get_retriever(index, 2)


def speak():
    data = input("Type 'exit' to stop the conversation\nYou: ")
    while data != "exit":
        print(f"Bot: ${engine.chat(data)}")
        data = input("You: ")

def label(text: str) -> dict:
    return get_labels_from_nodes_with_score(retriever.retrieve(text))
