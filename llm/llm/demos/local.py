from typing import Optional
from llama_index.data_structs.node import Node
from ..core.engines.default import get_engine
from ..core.indexes.vector import create_index
from ..core.camel_5b_hf import service_context

nodes = [
    Node(text="Tel Aviv was the most expensive city in the world according to the economist in 2022", 
         doc_id="tlv_2022"),
    Node(text="New York was the most expensive city in the world according to the economist in 2023", 
         doc_id="nyc_2023"),
    Node(text="Jonathan Rapoport is the developer of this package", 
         doc_id="jr_d"),
    Node(text="Jonathan Rapoport is the creator of the content this chat is based on", 
         doc_id="jr_c"),
    Node(text="Jonathan Rapoport is the CTO of Hypsibius", 
         doc_id="jr_cto"),
    Node(text="Saskia Hoffmann is the CEO of Hypsibius", 
         doc_id="sh_ceo"),
    Node(text="""Hypsibius was founded in May 2023 by Jonathan Rapoport and Saskia Hoffmann.
         It hasn't yet raised any capital""", 
         doc_id="hs_f"),
    Node(text="Hypsibius' offices will be in San Francisco and Tel Aviv", 
         doc_id="hs_o"),
]

index = create_index(nodes, service_context)
engine = get_engine(index)

def speak():
    data = input("Type 'exit' to stop the conversation\nYou: ")
    while data != "exit":
        print(f"Bot: ${engine.chat(data)}")
        data = input("You: ")
