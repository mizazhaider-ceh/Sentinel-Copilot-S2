"""
RAG Data Models
===============
Dataclasses for document chunks and processing results.
"""

import hashlib
from typing import Optional, List
from dataclasses import dataclass, field


@dataclass
class Chunk:
    """Represents a text chunk with rich metadata."""
    text: str
    page: int
    filename: str
    header: Optional[str] = None
    parent_header: Optional[str] = None
    chunk_type: str = "paragraph"
    char_start: int = 0
    char_end: int = 0
    sentence_count: int = 0
    importance_score: float = 1.0

    @property
    def id(self) -> str:
        """Generate deterministic chunk ID."""
        content_hash = hashlib.md5(self.text[:200].encode()).hexdigest()[:8]
        return f"{self.filename}_{self.page}_{self.char_start}_{content_hash}"

    @property
    def context_prefix(self) -> str:
        """Build hierarchical context prefix for embedding."""
        parts = []
        if self.parent_header:
            parts.append(self.parent_header)
        if self.header and self.header != self.parent_header:
            parts.append(self.header)
        return " > ".join(parts) if parts else ""


@dataclass
class ProcessingResult:
    """Result of document processing."""
    page_count: int
    chunk_count: int
    total_chars: int
    chunks: List[Chunk] = field(default_factory=list)
    headers_found: int = 0
    code_blocks_found: int = 0
    tables_found: int = 0
