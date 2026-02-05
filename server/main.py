"""
S2-Sentinel Copilot - Python RAG Backend Server
================================================
FastAPI server with ChromaDB vector store for enhanced RAG capabilities.

Features:
- Local embeddings (sentence-transformers) - no API costs!
- ChromaDB for vector storage and similarity search
- PyMuPDF for advanced PDF parsing (headers, tables, images)
- spaCy for semantic chunking
- CORS enabled for browser access

Usage:
    python main.py
    # or
    uvicorn main:app --host 0.0.0.0 --port 8765 --reload

Author: MIHx0 (Muhammad Izaz Haider)
Version: 1.0.0
"""

import os
import sys
import uuid
import hashlib
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from loguru import logger

# Import our modules
from rag import RAGProcessor, VectorStore
from config import Settings

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

settings = Settings()

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG" if settings.debug else "INFO"
)
logger.add(
    settings.log_file,
    rotation="10 MB",
    retention="7 days",
    level="DEBUG"
)

# ═══════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS (Request/Response Validation)
# ═══════════════════════════════════════════════════════════════════════════

class SearchRequest(BaseModel):
    """Search query request model."""
    subject_id: str = Field(..., min_length=1, max_length=50)
    query: str = Field(..., min_length=1, max_length=2000)
    limit: int = Field(default=5, ge=1, le=20)

class SearchResult(BaseModel):
    """Individual search result."""
    text: str
    page: int
    filename: str
    score: float
    header: Optional[str] = None
    chunk_type: Optional[str] = None
    vector_score: Optional[float] = None
    rrf_score: Optional[float] = None

class SearchResponse(BaseModel):
    """Search response model."""
    chunks: list[SearchResult]
    query: str
    subject_id: str
    total_chunks_searched: int
    search_method: str = "hybrid"
    query_expanded: bool = False

class DocumentResponse(BaseModel):
    """Document processing response."""
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    total_chars: int
    subject_id: str
    headers_found: int = 0
    code_blocks_found: int = 0
    tables_found: int = 0

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    embedding_model: str
    vector_store: str

class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None

# ═══════════════════════════════════════════════════════════════════════════
# GLOBAL STATE (initialized on startup)
# ═══════════════════════════════════════════════════════════════════════════

rag_processor: Optional[RAGProcessor] = None
vector_store: Optional[VectorStore] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - initialize on startup, cleanup on shutdown."""
    global rag_processor, vector_store
    
    logger.info("🚀 Starting S2-Sentinel RAG Backend...")
    
    # Initialize vector store
    vector_store = VectorStore(
        persist_directory=settings.chroma_db_path,
        embedding_model=settings.embedding_model
    )
    await vector_store.initialize()
    logger.info(f"✓ Vector store initialized: {settings.chroma_db_path}")
    
    # Initialize RAG processor
    rag_processor = RAGProcessor(vector_store)
    logger.info("✓ RAG processor ready")
    
    logger.info(f"🛡️ S2-Sentinel Backend v{settings.version} running on port {settings.port}")
    
    yield  # Application runs here
    
    # Cleanup
    logger.info("Shutting down...")
    if vector_store:
        await vector_store.close()

# ═══════════════════════════════════════════════════════════════════════════
# FASTAPI APPLICATION
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="S2-Sentinel RAG Backend",
    description="Enhanced RAG backend with ChromaDB vector storage for S2-Sentinel Copilot",
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# CORS middleware - allow browser access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600
)

# ═══════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint for frontend auto-detection.
    Returns server status and configuration.
    """
    return HealthResponse(
        status="healthy",
        version=settings.version,
        embedding_model=settings.embedding_model,
        vector_store="ChromaDB"
    )


@app.post("/documents/upload", response_model=DocumentResponse, tags=["Documents"])
async def upload_document(
    file: UploadFile = File(...),
    subject_id: str = Form(...)
):
    """
    Upload and process a PDF document.
    
    - Extracts text with PyMuPDF
    - Performs semantic chunking with header detection
    - Generates embeddings and stores in ChromaDB
    
    Args:
        file: PDF file to process
        subject_id: Subject identifier for organizing documents
    
    Returns:
        DocumentResponse with processing statistics
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Validate subject_id (alphanumeric + hyphen only)
    if not subject_id.replace('-', '').replace('_', '').isalnum():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subject_id format"
        )
    
    # Read file content
    content = await file.read()
    
    # Validate file size (max 50MB)
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit"
        )
    
    # Generate document ID
    file_hash = hashlib.sha256(content).hexdigest()[:16]
    document_id = f"{subject_id}_{file_hash}"
    
    logger.info(f"Processing document: {file.filename} for subject: {subject_id}")
    
    try:
        result = await rag_processor.process_document(
            content=content,
            filename=file.filename,
            document_id=document_id,
            subject_id=subject_id
        )
        
        logger.info(f"✓ Processed: {result['chunk_count']} chunks from {result['page_count']} pages")
        
        return DocumentResponse(
            document_id=document_id,
            filename=file.filename,
            page_count=result['page_count'],
            chunk_count=result['chunk_count'],
            total_chars=result['total_chars'],
            subject_id=subject_id,
            headers_found=result.get('headers_found', 0),
            code_blocks_found=result.get('code_blocks_found', 0),
            tables_found=result.get('tables_found', 0)
        )
        
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/search", response_model=SearchResponse, tags=["Search"])
async def search_documents(request: SearchRequest):
    """
    Search documents using semantic vector similarity.
    
    Args:
        request: SearchRequest with subject_id, query, and limit
    
    Returns:
        SearchResponse with ranked chunks
    """
    logger.debug(f"Search: '{request.query[:50]}...' in {request.subject_id}")
    
    try:
        results = await vector_store.search(
            subject_id=request.subject_id,
            query=request.query,
            limit=request.limit
        )
        
        chunks = [
            SearchResult(
                text=r['text'],
                page=r['metadata'].get('page', 0),
                filename=r['metadata'].get('filename', 'unknown'),
                score=r['score'],
                header=r['metadata'].get('header'),
                chunk_type=r['metadata'].get('chunk_type'),
                vector_score=r.get('vector_score'),
                rrf_score=r.get('rrf_score')
            )
            for r in results['matches']
        ]
        
        return SearchResponse(
            chunks=chunks,
            query=request.query,
            subject_id=request.subject_id,
            total_chunks_searched=results['total_searched'],
            search_method=results.get('search_method', 'hybrid'),
            query_expanded=results.get('query_expanded', False)
        )
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.delete("/documents/{document_id}", tags=["Documents"])
async def delete_document(document_id: str):
    """
    Delete a document and its chunks from the vector store.
    
    Args:
        document_id: Document ID to delete
    """
    try:
        await vector_store.delete_document(document_id)
        logger.info(f"Deleted document: {document_id}")
        return {"status": "deleted", "document_id": document_id}
        
    except Exception as e:
        logger.error(f"Delete failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/documents/{subject_id}", tags=["Documents"])
async def list_documents(subject_id: str):
    """
    List all documents for a subject.
    
    Args:
        subject_id: Subject identifier
    """
    try:
        docs = await vector_store.list_documents(subject_id)
        return {"subject_id": subject_id, "documents": docs}
        
    except Exception as e:
        logger.error(f"List failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for uncaught errors."""
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc)}
    )


# ═══════════════════════════════════════════════════════════════════════════
# WEB SEARCH PROXY (bypasses browser CORS restrictions)
# ═══════════════════════════════════════════════════════════════════════════

class WebSearchResult(BaseModel):
    """Web search result."""
    title: str
    url: str
    snippet: str
    source: str

class WebSearchResponse(BaseModel):
    """Web search response."""
    results: list[WebSearchResult]
    query: str

@app.get("/api/search", response_model=WebSearchResponse, tags=["Search"])
async def web_search(
    q: str = Query(..., min_length=1, max_length=500, description="Search query"),
    max_results: int = Query(default=5, ge=1, le=10, description="Max results")
):
    """
    Proxy web search endpoint - searches DuckDuckGo and Wikipedia.
    Solves CORS issues by making requests server-side.
    """
    results = []
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Strategy 1: DuckDuckGo Instant Answer API
        try:
            ddg_url = "https://api.duckduckgo.com/"
            ddg_resp = await client.get(ddg_url, params={
                "q": q,
                "format": "json",
                "no_html": "1",
                "skip_disambig": "1"
            })
            if ddg_resp.status_code == 200:
                data = ddg_resp.json()
                
                # Main abstract
                if data.get("Abstract") and data.get("AbstractText"):
                    results.append(WebSearchResult(
                        title=data.get("Heading", q),
                        url=data.get("AbstractURL", ""),
                        snippet=data["AbstractText"][:500],
                        source="DuckDuckGo"
                    ))
                
                # Related topics
                for topic in data.get("RelatedTopics", []):
                    if len(results) >= max_results:
                        break
                    if topic.get("Text") and topic.get("FirstURL"):
                        results.append(WebSearchResult(
                            title=topic["Text"].split(" - ")[0][:100],
                            url=topic["FirstURL"],
                            snippet=topic["Text"][:300],
                            source="DuckDuckGo"
                        ))
                    # Subtopics
                    for sub in topic.get("Topics", [])[:2]:
                        if len(results) >= max_results:
                            break
                        if sub.get("Text") and sub.get("FirstURL"):
                            results.append(WebSearchResult(
                                title=sub["Text"].split(" - ")[0][:100],
                                url=sub["FirstURL"],
                                snippet=sub["Text"][:300],
                                source="DuckDuckGo"
                            ))
                
                logger.debug(f"DDG returned {len(results)} results for: {q}")
                            
        except Exception as e:
            logger.warning(f"DDG search failed: {e}")
        
        # Strategy 2: Wikipedia (if DDG gave few results)
        if len(results) < max_results:
            try:
                wiki_url = "https://en.wikipedia.org/w/api.php"
                wiki_resp = await client.get(wiki_url, params={
                    "action": "query",
                    "list": "search",
                    "srsearch": q,
                    "format": "json",
                    "srlimit": str(max_results - len(results)),
                    "srprop": "snippet|titlesnippet"
                })
                if wiki_resp.status_code == 200:
                    wiki_data = wiki_resp.json()
                    for item in wiki_data.get("query", {}).get("search", []):
                        if len(results) >= max_results:
                            break
                        import re
                        clean_snippet = re.sub(r"<[^>]*>", "", item.get("snippet", ""))
                        title = item.get("title", "")
                        results.append(WebSearchResult(
                            title=title,
                            url=f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                            snippet=clean_snippet[:300],
                            source="Wikipedia"
                        ))
                    
                    logger.debug(f"Wikipedia returned {len(results)} total results for: {q}")
                    
            except Exception as e:
                logger.warning(f"Wikipedia search failed: {e}")
    
    return WebSearchResponse(results=results, query=q)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )
