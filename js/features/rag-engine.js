/**
 * rag-engine.js
 * Client-side RAG (Retrieval-Augmented Generation) Engine
 * Handles PDF processing, chunking, and context retrieval
 */

import { StorageIDB } from '../services/storage-idb.js';
import { CONSTANTS } from '../config-s2.js';

export const RAGEngine = {

    CHUNK_SIZE: CONSTANTS.CHUNK_SIZE || 500,
    CHUNK_OVERLAP: CONSTANTS.CHUNK_OVERLAP || 50,
    MAX_CHUNKS: CONSTANTS.MAX_CONTEXT_CHUNKS || 5,

    /**
     * Process and store a PDF document
     * @param {string} subjectId - Subject identifier
     * @param {File} file - PDF file to process
     * @returns {Promise<Object>} Processing result
     */
    async processDocument(subjectId, file) {
        // Validate file type
        if (file.type !== 'application/pdf') {
            throw new Error('Only PDF files are currently supported');
        }

        console.log(`[RAG] Processing: ${file.name} for ${subjectId}`);

        // Save document to IndexedDB
        const docId = await StorageIDB.saveDocument(subjectId, file);
        console.log(`[RAG] Document saved with ID: ${docId}`);

        // Parse PDF using PDF.js
        const arrayBuffer = await file.arrayBuffer();
        
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js library not loaded');
        }

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log(`[RAG] PDF loaded: ${pdf.numPages} pages`);

        const chunks = [];
        let totalChars = 0;

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items with proper spacing
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();

            totalChars += pageText.length;

            // Chunk the page text
            const pageChunks = this.chunkText(pageText, pageNum, file.name);
            chunks.push(...pageChunks);
        }

        // Save chunks to IndexedDB
        await StorageIDB.saveChunks(docId, subjectId, chunks);

        // Update document metadata
        await StorageIDB.updateDocument(docId, { 
            pageCount: pdf.numPages,
            chunkCount: chunks.length,
            totalChars 
        });

        console.log(`[RAG] Processed: ${chunks.length} chunks from ${pdf.numPages} pages`);

        return {
            docId,
            filename: file.name,
            pageCount: pdf.numPages,
            chunkCount: chunks.length,
            totalChars
        };
    },

    /**
     * Split text into overlapping chunks
     * @param {string} text - Text to chunk
     * @param {number} page - Page number
     * @param {string} filename - Source filename
     * @returns {Array} Array of chunk objects
     */
    chunkText(text, page, filename) {
        if (!text || text.length === 0) return [];

        const chunks = [];
        let start = 0;

        while (start < text.length) {
            let end = start + this.CHUNK_SIZE;

            // Try to break at sentence boundary
            if (end < text.length) {
                const sentenceEnd = text.lastIndexOf('.', end);
                if (sentenceEnd > start + this.CHUNK_SIZE * 0.5) {
                    end = sentenceEnd + 1;
                }
            } else {
                end = text.length;
            }

            const chunkText = text.slice(start, end).trim();
            
            if (chunkText.length > 30) { // Skip very small chunks
                chunks.push({
                    text: chunkText,
                    page,
                    filename,
                    charStart: start,
                    charEnd: end
                });
            }

            // Move start with overlap
            start = end - this.CHUNK_OVERLAP;
            if (start >= text.length) break;
        }

        return chunks;
    },

    /**
     * Retrieve relevant context chunks for a query
     * @param {string} subjectId - Subject identifier
     * @param {string} query - User's question
     * @param {number} limit - Maximum chunks to return
     * @returns {Promise<Array>} Relevant chunks
     */
    async retrieveContext(subjectId, query, limit = null) {
        limit = limit || this.MAX_CHUNKS;
        
        const chunks = await StorageIDB.searchChunks(subjectId, query, limit);
        
        console.log(`[RAG] Retrieved ${chunks.length} chunks for query: "${query.slice(0, 50)}..."`);
        
        return chunks.map(chunk => ({
            text: chunk.text,
            page: chunk.page,
            filename: chunk.filename,
            score: chunk.score
        }));
    },

    /**
     * Get all documents for a subject
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Array>} Documents with metadata
     */
    async getDocuments(subjectId) {
        const docs = await StorageIDB.getDocuments(subjectId);
        
        return docs.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            pageCount: doc.pageCount || 0,
            chunkCount: doc.chunkCount || 0,
            size: doc.size,
            uploadedAt: doc.uploadedAt,
            mimeType: doc.mimeType
        }));
    },

    /**
     * Delete a document and its chunks
     * @param {number} documentId - Document ID
     */
    async deleteDocument(documentId) {
        await StorageIDB.deleteDocument(documentId);
        console.log(`[RAG] Deleted document: ${documentId}`);
    },

    /**
     * Get document count per subject
     * @returns {Promise<Object>} { subjectId: count }
     */
    async getDocumentCounts() {
        const allDocs = await StorageIDB.getAllDocuments();
        const counts = {};
        
        allDocs.forEach(doc => {
            counts[doc.subjectId] = (counts[doc.subjectId] || 0) + 1;
        });

        return counts;
    },

    /**
     * Preview document content (for UI)
     * @param {number} documentId - Document ID
     * @returns {Promise<Array>} First few chunks
     */
    async previewDocument(documentId) {
        const chunks = await StorageIDB.getChunksForDocument(documentId);
        return chunks.slice(0, 3).map(c => ({
            text: c.text.slice(0, 200) + '...',
            page: c.page
        }));
    },

    /**
     * Calculate RAG statistics
     * @returns {Promise<Object>} Statistics
     */
    async getStats() {
        const docs = await StorageIDB.getAllDocuments();
        const totalSize = docs.reduce((acc, d) => acc + (d.size || 0), 0);
        const totalPages = docs.reduce((acc, d) => acc + (d.pageCount || 0), 0);
        const totalChunks = docs.reduce((acc, d) => acc + (d.chunkCount || 0), 0);

        return {
            documentCount: docs.length,
            totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
            totalPages,
            totalChunks,
            averageChunksPerDoc: docs.length > 0 ? Math.round(totalChunks / docs.length) : 0
        };
    },

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
};
