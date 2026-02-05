"""
Advanced Semantic Chunker
=========================
Production-grade chunker with:
- Hierarchical header tracking (H1 > H2 > H3)
- Sentence-boundary-aware splitting
- Code block preservation (never splits mid-code)
- Table detection and grouping
- Definition/term detection
- Smart overlap at sentence boundaries
"""

import re
from typing import Optional, List, Tuple

from .models import Chunk


class SemanticChunker:
    """Hierarchical semantic chunker with smart splitting."""

    HEADER_PATTERNS = [
        (r'^#{1}\s+(.+)', 1),
        (r'^#{2}\s+(.+)', 2),
        (r'^#{3,6}\s+(.+)', 3),
        (r'^([A-Z][A-Z\s]{2,}):?\s*$', 1),
        (r'^(\d+)\.\s+([A-Z].+)', 2),
        (r'^(\d+\.\d+)\s+(.+)', 3),
        (r'^([IVXLCDM]+)\.\s+(.+)', 2),
        (r'^Chapter\s+(\d+)\s*[:\-]?\s*(.*)', 1),
        (r'^Section\s+(\d+)\s*[:\-]?\s*(.*)', 2),
    ]

    TABLE_PATTERNS = [
        r'\|.*\|.*\|',
        r'\+[-=]+\+',
    ]

    DEFINITION_PATTERN = re.compile(
        r'^([A-Z][\w\s\-]+)\s*[:–—]\s+(.{20,})', re.MULTILINE
    )

    SENTENCE_END = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 80, min_chunk_size: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size
        self._header_matchers = [(re.compile(p, re.MULTILINE), lvl) for p, lvl in self.HEADER_PATTERNS]
        self._table_regex = re.compile('|'.join(self.TABLE_PATTERNS), re.MULTILINE)

    def _detect_header(self, line: str) -> Optional[Tuple[str, int]]:
        """Detect header and return (text, level) or None."""
        stripped = line.strip()
        for regex, level in self._header_matchers:
            match = regex.match(stripped)
            if match:
                groups = match.groups()
                header_text = groups[-1] if groups else stripped
                header_text = re.sub(r'^[#\d\.\s\-:]+', '', header_text).strip()
                if header_text:
                    return (header_text, level)
        return None

    def _is_code_fence(self, line: str) -> bool:
        return line.strip().startswith('```')

    def _is_table_line(self, line: str) -> bool:
        return bool(self._table_regex.match(line.strip()))

    def _count_sentences(self, text: str) -> int:
        """Count sentences in text."""
        return len(self.SENTENCE_END.split(text))

    def _split_at_sentence_boundary(self, text: str, target_size: int) -> Tuple[str, str]:
        """Split text near target_size at the nearest sentence boundary."""
        if len(text) <= target_size:
            return text, ""

        boundaries = [0]
        for match in self.SENTENCE_END.finditer(text):
            boundaries.append(match.start())
        boundaries.append(len(text))

        best_split = target_size
        min_diff = float('inf')

        for boundary in boundaries:
            diff = abs(boundary - target_size)
            if diff < min_diff and boundary > self.min_chunk_size:
                min_diff = diff
                best_split = boundary

        return text[:best_split].strip(), text[best_split:].strip()

    def _compute_importance(self, chunk_text: str, chunk_type: str, has_header: bool) -> float:
        """Pre-compute importance score for a chunk."""
        score = 1.0

        if has_header:
            score *= 1.3
        if self.DEFINITION_PATTERN.search(chunk_text):
            score *= 1.4
        if chunk_type == "code":
            score *= 1.2

        tech_markers = ['example', 'important', 'note', 'warning', 'definition',
                        'algorithm', 'protocol', 'syntax', 'command', 'function']
        lower_text = chunk_text.lower()
        for marker in tech_markers:
            if marker in lower_text:
                score *= 1.1
                break

        if len(chunk_text) < 100:
            score *= 0.7

        return round(min(score, 2.0), 2)

    def chunk_text(self, text: str, page: int, filename: str) -> List[Chunk]:
        """Split text into semantic chunks with hierarchical context."""
        if not text or len(text.strip()) < 30:
            return []

        chunks = []
        lines = text.split('\n')

        header_stack = [None, None, None]
        current_content: List[str] = []
        current_size = 0
        char_pos = 0
        chunk_start = 0
        in_code_block = False
        in_table = False

        def get_parent_header():
            for h in header_stack:
                if h:
                    return h
            return None

        def get_current_header():
            for h in reversed(header_stack):
                if h:
                    return h
            return None

        def flush_chunk(chunk_type="paragraph"):
            nonlocal current_content, current_size, chunk_start

            if not current_content:
                return

            chunk_text = '\n'.join(current_content).strip()

            if len(chunk_text) < self.min_chunk_size:
                return

            header = get_current_header()
            parent = get_parent_header()

            display_text = chunk_text
            if header:
                display_text = f"## {header}\n\n{chunk_text}"

            importance = self._compute_importance(chunk_text, chunk_type, header is not None)

            chunks.append(Chunk(
                text=display_text,
                page=page,
                filename=filename,
                header=header,
                parent_header=parent if parent != header else None,
                chunk_type=chunk_type,
                char_start=chunk_start,
                char_end=char_pos,
                sentence_count=self._count_sentences(chunk_text),
                importance_score=importance
            ))

            current_content = []
            current_size = 0
            chunk_start = char_pos

        for line in lines:
            line_len = len(line) + 1
            stripped = line.strip()

            # Handle code fences
            if self._is_code_fence(line):
                if in_code_block:
                    current_content.append(line)
                    current_size += line_len
                    in_code_block = False
                    flush_chunk("code")
                else:
                    flush_chunk()
                    current_content.append(line)
                    current_size += line_len
                    in_code_block = True
                char_pos += line_len
                continue

            if in_code_block:
                current_content.append(line)
                current_size += line_len
                char_pos += line_len
                continue

            # Table detection
            if self._is_table_line(line):
                if not in_table:
                    flush_chunk()
                    in_table = True
                current_content.append(line)
                current_size += line_len
                char_pos += line_len
                continue
            elif in_table:
                in_table = False
                flush_chunk("table")

            # Header detection
            header_info = self._detect_header(line)
            if header_info:
                flush_chunk()
                header_text, level = header_info

                idx = min(level - 1, 2)
                header_stack[idx] = header_text
                for i in range(idx + 1, 3):
                    header_stack[i] = None

                chunk_start = char_pos
                char_pos += line_len
                continue

            # Regular content
            if stripped:
                if current_size + line_len > self.chunk_size and current_content:
                    full_text = '\n'.join(current_content) + '\n' + line
                    first_part, remainder = self._split_at_sentence_boundary(full_text, self.chunk_size)

                    current_content = [first_part]
                    current_size = len(first_part)
                    flush_chunk()

                    if remainder:
                        overlap_text = first_part[-(self.chunk_overlap):] if self.chunk_overlap > 0 else ""
                        if overlap_text:
                            current_content = [overlap_text, remainder]
                            current_size = len(overlap_text) + len(remainder)
                        else:
                            current_content = [remainder]
                            current_size = len(remainder)
                else:
                    current_content.append(line)
                    current_size += line_len

            char_pos += line_len

        # Flush remaining
        if in_code_block:
            flush_chunk("code")
        elif in_table:
            flush_chunk("table")
        else:
            flush_chunk()

        return chunks
