"""
RAG Processor (Orchestrator)
=============================
Main orchestrator that ties together PDF processing,
chunking, and hybrid vector+keyword storage.
"""

from typing import Dict, Any

from .pdf_processor import PDFProcessor
from .vector_store import VectorStore


class RAGProcessor:
    """Main RAG orchestrator with hybrid vector+keyword storage."""

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.pdf_processor = PDFProcessor()

    async def process_document(
        self,
        content: bytes,
        filename: str,
        document_id: str,
        subject_id: str
    ) -> Dict[str, Any]:
        """Process a document and store in hybrid index."""
        result = self.pdf_processor.process(content, filename)

        await self.vector_store.add_chunks(
            subject_id=subject_id,
            document_id=document_id,
            chunks=result.chunks
        )

        return {
            "page_count": result.page_count,
            "chunk_count": result.chunk_count,
            "total_chars": result.total_chars,
            "headers_found": result.headers_found,
            "code_blocks_found": result.code_blocks_found,
            "tables_found": result.tables_found
        }
