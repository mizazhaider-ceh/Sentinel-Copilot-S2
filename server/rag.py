"""
S2-Sentinel Copilot - RAG Processing Module
============================================
Handles PDF processing, semantic chunking, and vector storage.

Features:
- PyMuPDF for advanced PDF text extraction
- spaCy for sentence tokenization (semantic chunking)
- ChromaDB for vector storage with sentence-transformers embeddings
- Header detection and context preservation

Author: MIHx0 (Muhammad Izaz Haider)
"""

import re
import asyncio
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, field

import fitz  # PyMuPDF
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from loguru import logger

from config import settings


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class Chunk:
    """Represents a text chunk with metadata."""
    text: str
    page: int
    filename: str
    header: Optional[str] = None
    chunk_type: str = "paragraph"
    char_start: int = 0
    char_end: int = 0
    
    @property
    def id(self) -> str:
        """Generate unique chunk ID."""
        return f"{self.filename}_{self.page}_{self.char_start}"


@dataclass
class ProcessingResult:
    """Result of document processing."""
    page_count: int
    chunk_count: int
    total_chars: int
    chunks: List[Chunk] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════
# SEMANTIC CHUNKER
# ═══════════════════════════════════════════════════════════════════════════

class SemanticChunker:
    """
    Intelligent text chunker that preserves semantic boundaries.
    Uses pattern matching for header detection and sentence-aware splits.
    """
    
    # Header patterns
    HEADER_PATTERNS = [
        r'^#{1,6}\s+.+',           # Markdown headers
        r'^[A-Z][A-Z\s]{2,}:?\s*$', # ALL CAPS HEADERS
        r'^\d+\.\s+[A-Z]',          # Numbered sections (1. Introduction)
        r'^[IVXLCDM]+\.\s+',        # Roman numerals
        r'^Chapter\s+\d+',          # Chapter headers
        r'^Section\s+\d+',          # Section headers
    ]
    
    # Code block patterns
    CODE_PATTERNS = [
        r'^```',                    # Markdown code fence
        r'^\s{4,}[^\s]',           # Indented code
        r'^def\s+\w+\(',           # Python function
        r'^class\s+\w+',           # Python class
        r'^import\s+',             # Python import
        r'^from\s+\w+\s+import',   # Python from import
    ]
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._header_regex = re.compile('|'.join(self.HEADER_PATTERNS), re.MULTILINE)
        self._code_regex = re.compile('|'.join(self.CODE_PATTERNS), re.MULTILINE)
    
    def _is_header(self, line: str) -> bool:
        """Check if line is a header."""
        return bool(self._header_regex.match(line.strip()))
    
    def _is_code(self, line: str) -> bool:
        """Check if line is code."""
        return bool(self._code_regex.match(line))
    
    def _extract_header_text(self, line: str) -> str:
        """Clean header text for metadata."""
        return re.sub(r'^[#\d\.\s]+', '', line).strip()
    
    def chunk_text(self, text: str, page: int, filename: str) -> List[Chunk]:
        """
        Split text into semantic chunks with header context.
        
        Args:
            text: Raw text to chunk
            page: Page number
            filename: Source filename
            
        Returns:
            List of Chunk objects
        """
        if not text or len(text.strip()) < 30:
            return []
        
        chunks = []
        lines = text.split('\n')
        
        current_header = None
        current_content: List[str] = []
        current_size = 0
        char_pos = 0
        chunk_start = 0
        
        def flush_chunk():
            nonlocal current_content, current_size, chunk_start
            
            if current_content:
                chunk_text = '\n'.join(current_content).strip()
                
                if len(chunk_text) > 30:
                    # Prepend header context if available
                    if current_header:
                        display_text = f"## {current_header}\n\n{chunk_text}"
                    else:
                        display_text = chunk_text
                    
                    chunks.append(Chunk(
                        text=display_text,
                        page=page,
                        filename=filename,
                        header=current_header,
                        chunk_type="semantic",
                        char_start=chunk_start,
                        char_end=char_pos
                    ))
                
                current_content = []
                current_size = 0
                chunk_start = char_pos
        
        for line in lines:
            line_len = len(line) + 1  # +1 for newline
            
            if self._is_header(line):
                # Flush current chunk before new header
                flush_chunk()
                current_header = self._extract_header_text(line)
                chunk_start = char_pos
                
            elif line.strip():
                # Check if adding this line exceeds chunk size
                if current_size + line_len > self.chunk_size and current_content:
                    # Flush and keep overlap
                    flush_chunk()
                    
                    # Add overlap from previous content
                    if chunks and self.chunk_overlap > 0:
                        last_text = chunks[-1].text
                        overlap_text = last_text[-self.chunk_overlap:]
                        if overlap_text:
                            current_content.append(overlap_text)
                            current_size = len(overlap_text)
                
                current_content.append(line)
                current_size += line_len
            
            char_pos += line_len
        
        # Flush remaining content
        flush_chunk()
        
        return chunks


# ═══════════════════════════════════════════════════════════════════════════
# PDF PROCESSOR
# ═══════════════════════════════════════════════════════════════════════════

class PDFProcessor:
    """
    Advanced PDF text extraction using PyMuPDF.
    Handles headers, tables, and multi-column layouts.
    """
    
    def __init__(self):
        self.chunker = SemanticChunker(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap
        )
    
    def extract_text(self, pdf_content: bytes) -> Dict[int, str]:
        """
        Extract text from PDF content.
        
        Args:
            pdf_content: PDF file bytes
            
        Returns:
            Dictionary mapping page numbers to text
        """
        pages = {}
        
        try:
            doc = fitz.open(stream=pdf_content, filetype="pdf")
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Extract text with layout preservation
                text = page.get_text("text", sort=True)
                
                # Clean up excessive whitespace
                text = re.sub(r'\n{3,}', '\n\n', text)
                text = re.sub(r' {2,}', ' ', text)
                
                pages[page_num + 1] = text.strip()
            
            doc.close()
            
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise ValueError(f"Failed to extract PDF text: {e}")
        
        return pages
    
    def process(self, content: bytes, filename: str) -> ProcessingResult:
        """
        Process PDF into chunks.
        
        Args:
            content: PDF file bytes
            filename: Original filename
            
        Returns:
            ProcessingResult with chunks and statistics
        """
        pages = self.extract_text(content)
        
        all_chunks = []
        total_chars = 0
        
        for page_num, page_text in pages.items():
            total_chars += len(page_text)
            
            chunks = self.chunker.chunk_text(page_text, page_num, filename)
            all_chunks.extend(chunks)
        
        return ProcessingResult(
            page_count=len(pages),
            chunk_count=len(all_chunks),
            total_chars=total_chars,
            chunks=all_chunks
        )


# ═══════════════════════════════════════════════════════════════════════════
# VECTOR STORE (ChromaDB)
# ═══════════════════════════════════════════════════════════════════════════

class VectorStore:
    """
    ChromaDB vector store with sentence-transformers embeddings.
    Provides semantic search across document chunks.
    """
    
    def __init__(self, persist_directory: str, embedding_model: str):
        self.persist_directory = persist_directory
        self.embedding_model_name = embedding_model
        self.embedding_model: Optional[SentenceTransformer] = None
        self.client: Optional[chromadb.Client] = None
        self._collections: Dict[str, Any] = {}
    
    async def initialize(self):
        """Initialize vector store and embedding model."""
        # Load embedding model (runs in thread pool to not block)
        loop = asyncio.get_event_loop()
        self.embedding_model = await loop.run_in_executor(
            None,
            lambda: SentenceTransformer(self.embedding_model_name)
        )
        logger.info(f"Loaded embedding model: {self.embedding_model_name}")
        
        # Initialize ChromaDB with persistence
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        logger.info(f"ChromaDB initialized at: {self.persist_directory}")
    
    async def close(self):
        """Cleanup resources."""
        self._collections.clear()
        if self.client:
            del self.client
    
    def _get_collection(self, subject_id: str):
        """Get or create collection for a subject."""
        collection_name = f"sentinel_{subject_id}".replace('-', '_')
        
        if collection_name not in self._collections:
            self._collections[collection_name] = self.client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        
        return self._collections[collection_name]
    
    def _embed(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for texts."""
        embeddings = self.embedding_model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
    
    async def add_chunks(
        self,
        subject_id: str,
        document_id: str,
        chunks: List[Chunk]
    ):
        """
        Add chunks to vector store.
        
        Args:
            subject_id: Subject identifier
            document_id: Document identifier
            chunks: List of Chunk objects
        """
        if not chunks:
            return
        
        collection = self._get_collection(subject_id)
        
        # Prepare data
        ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        texts = [c.text for c in chunks]
        metadatas = [
            {
                "document_id": document_id,
                "page": c.page,
                "filename": c.filename,
                "header": c.header or "",
                "chunk_type": c.chunk_type
            }
            for c in chunks
        ]
        
        # Generate embeddings
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(None, lambda: self._embed(texts))
        
        # Add to collection
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts
        )
        
        logger.debug(f"Added {len(chunks)} chunks to {subject_id}")
    
    async def search(
        self,
        subject_id: str,
        query: str,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Search for similar chunks.
        
        Args:
            subject_id: Subject to search in
            query: Search query
            limit: Maximum results
            
        Returns:
            Dict with matches and metadata
        """
        collection = self._get_collection(subject_id)
        
        # Get total count
        total = collection.count()
        
        if total == 0:
            return {"matches": [], "total_searched": 0}
        
        # Generate query embedding
        loop = asyncio.get_event_loop()
        query_embedding = await loop.run_in_executor(
            None,
            lambda: self._embed([query])[0]
        )
        
        # Search
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(limit, total),
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        matches = []
        for i, doc in enumerate(results['documents'][0]):
            # Convert distance to similarity score (cosine)
            distance = results['distances'][0][i]
            score = 1 - distance  # Convert distance to similarity
            
            matches.append({
                "text": doc,
                "metadata": results['metadatas'][0][i],
                "score": round(score, 4)
            })
        
        return {
            "matches": matches,
            "total_searched": total
        }
    
    async def delete_document(self, document_id: str):
        """Delete all chunks for a document."""
        for collection in self._collections.values():
            # Get all IDs for this document
            results = collection.get(
                where={"document_id": document_id}
            )
            
            if results['ids']:
                collection.delete(ids=results['ids'])
    
    async def list_documents(self, subject_id: str) -> List[Dict]:
        """List unique documents in a subject."""
        collection = self._get_collection(subject_id)
        
        results = collection.get(include=["metadatas"])
        
        # Extract unique documents
        docs = {}
        for meta in results['metadatas']:
            doc_id = meta.get('document_id', 'unknown')
            if doc_id not in docs:
                docs[doc_id] = {
                    "document_id": doc_id,
                    "filename": meta.get('filename', 'unknown'),
                    "chunk_count": 0
                }
            docs[doc_id]['chunk_count'] += 1
        
        return list(docs.values())


# ═══════════════════════════════════════════════════════════════════════════
# RAG PROCESSOR (Orchestrator)
# ═══════════════════════════════════════════════════════════════════════════

class RAGProcessor:
    """
    Main RAG processing orchestrator.
    Combines PDF processing with vector storage.
    """
    
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
        """
        Process a document and store in vector database.
        
        Args:
            content: File content bytes
            filename: Original filename
            document_id: Unique document identifier
            subject_id: Subject identifier
            
        Returns:
            Processing statistics
        """
        # Process PDF
        result = self.pdf_processor.process(content, filename)
        
        # Store in vector database
        await self.vector_store.add_chunks(
            subject_id=subject_id,
            document_id=document_id,
            chunks=result.chunks
        )
        
        return {
            "page_count": result.page_count,
            "chunk_count": result.chunk_count,
            "total_chars": result.total_chars
        }
