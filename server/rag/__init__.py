"""
S2-Sentinel Copilot - RAG Package
===================================
Ultra-Advanced RAG Processing with hybrid search, reranking,
query expansion, multi-strategy chunking, and cross-encoder scoring.

Architecture:
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  PDF Ingestion│────>│  Smart Chunking  │────>│   Dual Indexing   │
│  (PyMuPDF)   │     │  + Metadata      │     │  Vector + BM25    │
└──────────────┘     └─────────────────┘     └──────────────────┘
                                                       │
                           ┌───────────────────────────┘
                           ▼
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Query Engine  │────>│  Hybrid Search   │────>│  Cross-Encoder    │
│ + Expansion   │     │  Vector + BM25   │     │  Reranking        │
└──────────────┘     └─────────────────┘     └──────────────────┘

Modules:
- models.py         - Chunk and ProcessingResult dataclasses
- bm25.py           - Okapi BM25 keyword index
- chunker.py        - Hierarchical semantic chunker
- pdf_processor.py  - PyMuPDF PDF extraction + header detection
- query_expander.py - CS-domain query expansion with synonyms
- vector_store.py   - ChromaDB + BM25 hybrid with RRF + cross-encoder
- processor.py      - RAGProcessor orchestrator

Author: MIHx0 (Muhammad Izaz Haider)
"""

def __getattr__(name):
    """Lazy imports to avoid loading heavy ML libs on package access."""
    if name == "RAGProcessor":
        from .processor import RAGProcessor
        return RAGProcessor
    if name == "VectorStore":
        from .vector_store import VectorStore
        return VectorStore
    if name == "Chunk":
        from .models import Chunk
        return Chunk
    if name == "ProcessingResult":
        from .models import ProcessingResult
        return ProcessingResult
    raise AttributeError(f"module 'rag' has no attribute {name!r}")

__all__ = [
    "RAGProcessor",
    "VectorStore",
    "Chunk",
    "ProcessingResult",
]
