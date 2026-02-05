/**
 * storage-idb.js
 * IndexedDB wrapper for S2-Sentinel Copilot
 * Handles documents, chunks, and analytics storage
 */

import { CONSTANTS } from '../config-s2.js';

const DB_NAME = CONSTANTS.DB_NAME;
const DB_VERSION = CONSTANTS.DB_VERSION;

let db = null;

export const StorageIDB = {

    /**
     * Initialize IndexedDB connection
     */
    async init() {
        if (db) return db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB Error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('IndexedDB initialized:', DB_NAME);
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;

                // Documents store - stores PDF files
                if (!database.objectStoreNames.contains('documents')) {
                    const docStore = database.createObjectStore('documents', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    docStore.createIndex('subjectId', 'subjectId', { unique: false });
                    docStore.createIndex('filename', 'filename', { unique: false });
                    docStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
                }

                // Chunks store - stores text chunks from documents
                if (!database.objectStoreNames.contains('chunks')) {
                    const chunkStore = database.createObjectStore('chunks', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    chunkStore.createIndex('documentId', 'documentId', { unique: false });
                    chunkStore.createIndex('subjectId', 'subjectId', { unique: false });
                    chunkStore.createIndex('page', 'page', { unique: false });
                }

                // Analytics store - stores per-subject metrics
                if (!database.objectStoreNames.contains('analytics')) {
                    database.createObjectStore('analytics', { keyPath: 'subjectId' });
                }

                // Settings store - stores app settings
                if (!database.objectStoreNames.contains('settings')) {
                    database.createObjectStore('settings', { keyPath: 'key' });
                }

                // Conversations store - stores chat history
                if (!database.objectStoreNames.contains('conversations')) {
                    const convStore = database.createObjectStore('conversations', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    convStore.createIndex('subjectId', 'subjectId', { unique: false });
                    convStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('IndexedDB schema created/upgraded');
            };
        });
    },

    // ============ DOCUMENT OPERATIONS ============

    /**
     * Save a document file
     * @param {string} subjectId - Subject identifier
     * @param {File} file - File object to store
     * @returns {Promise<number>} Document ID
     */
    async saveDocument(subjectId, file) {
        await this.init();
        
        const blob = await file.arrayBuffer();
        const doc = {
            subjectId,
            filename: file.name,
            blob: new Blob([blob], { type: file.type }),
            mimeType: file.type,
            size: file.size,
            uploadedAt: Date.now(),
            pageCount: 0
        };

        return this._add('documents', doc);
    },

    /**
     * Get all documents for a subject
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Array>} Documents array
     */
    async getDocuments(subjectId) {
        await this.init();
        return this._getAllByIndex('documents', 'subjectId', subjectId);
    },

    /**
     * Get all documents across all subjects
     * @returns {Promise<Array>} All documents
     */
    async getAllDocuments() {
        await this.init();
        return this._getAll('documents');
    },

    /**
     * Delete a document and its chunks
     * @param {number} documentId - Document ID
     */
    async deleteDocument(documentId) {
        await this.init();
        
        // Delete chunks first
        const chunks = await this._getAllByIndex('chunks', 'documentId', documentId);
        for (const chunk of chunks) {
            await this._delete('chunks', chunk.id);
        }
        
        // Delete document
        await this._delete('documents', documentId);
    },

    /**
     * Update document metadata (e.g., page count after processing)
     * @param {number} documentId - Document ID
     * @param {Object} updates - Fields to update
     */
    async updateDocument(documentId, updates) {
        await this.init();
        const doc = await this._get('documents', documentId);
        if (doc) {
            const updated = { ...doc, ...updates };
            await this._put('documents', updated);
        }
    },

    // ============ CHUNK OPERATIONS ============

    /**
     * Save multiple chunks for a document
     * @param {number} documentId - Parent document ID
     * @param {string} subjectId - Subject identifier
     * @param {Array} chunks - Array of chunk objects { text, page, charStart, charEnd }
     */
    async saveChunks(documentId, subjectId, chunks) {
        await this.init();
        
        const tx = db.transaction('chunks', 'readwrite');
        const store = tx.objectStore('chunks');

        for (const chunk of chunks) {
            store.add({
                ...chunk,
                documentId,
                subjectId,
                createdAt: Date.now()
            });
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(chunks.length);
            tx.onerror = () => reject(tx.error);
        });
    },

    /**
     * Search chunks by keyword matching
     * @param {string} subjectId - Subject identifier
     * @param {string} query - Search query
     * @param {number} limit - Max results
     * @returns {Promise<Array>} Matching chunks sorted by relevance
     */
    async searchChunks(subjectId, query, limit = 5) {
        await this.init();
        
        const chunks = await this._getAllByIndex('chunks', 'subjectId', subjectId);
        
        // Simple keyword matching with scoring
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        const scored = chunks.map(chunk => {
            const text = chunk.text.toLowerCase();
            let score = 0;
            
            queryWords.forEach(word => {
                // Count occurrences
                const matches = (text.match(new RegExp(word, 'gi')) || []).length;
                score += matches;
                
                // Bonus for exact phrase matches
                if (text.includes(query.toLowerCase())) {
                    score += 5;
                }
            });

            return { ...chunk, score };
        });

        return scored
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },

    /**
     * Get all chunks for a document
     * @param {number} documentId - Document ID
     * @returns {Promise<Array>} Chunks array
     */
    async getChunksForDocument(documentId) {
        await this.init();
        return this._getAllByIndex('chunks', 'documentId', documentId);
    },

    // ============ ANALYTICS OPERATIONS ============

    /**
     * Get analytics for a subject
     * @param {string} subjectId - Subject identifier
     * @returns {Promise<Object>} Analytics object
     */
    async getAnalytics(subjectId) {
        await this.init();
        return this._get('analytics', subjectId) || {
            subjectId,
            studyTime: 0,
            quizScores: [],
            weakTopics: [],
            sessions: [],
            lastAccessed: null
        };
    },

    /**
     * Get analytics for all subjects
     * @returns {Promise<Array>} All analytics
     */
    async getAllAnalytics() {
        await this.init();
        return this._getAll('analytics');
    },

    /**
     * Update analytics for a subject
     * @param {string} subjectId - Subject identifier
     * @param {Object} updates - Analytics updates
     */
    async updateAnalytics(subjectId, updates) {
        await this.init();
        
        const existing = await this.getAnalytics(subjectId);
        const merged = { ...existing, subjectId };

        // Merge numeric fields additively
        if (updates.studyTime) {
            merged.studyTime = (existing.studyTime || 0) + updates.studyTime;
        }

        // Append to arrays
        if (updates.quizScore !== undefined) {
            merged.quizScores = [...(existing.quizScores || []), {
                score: updates.quizScore,
                total: updates.quizTotal || 10,
                timestamp: Date.now()
            }];
        }

        if (updates.session) {
            merged.sessions = [...(existing.sessions || []), updates.session];
            // Keep last 100 sessions
            if (merged.sessions.length > 100) {
                merged.sessions = merged.sessions.slice(-100);
            }
        }

        if (updates.weakTopic) {
            merged.weakTopics = [...new Set([...(existing.weakTopics || []), updates.weakTopic])];
        }

        merged.lastAccessed = Date.now();

        return this._put('analytics', merged);
    },

    // ============ CONVERSATION OPERATIONS ============

    /**
     * Save a conversation session
     * @param {string} subjectId - Subject identifier
     * @param {Array} messages - Array of message objects
     */
    async saveConversation(subjectId, messages) {
        await this.init();
        return this._add('conversations', {
            subjectId,
            messages,
            timestamp: Date.now()
        });
    },

    /**
     * Get recent conversations for a subject
     * @param {string} subjectId - Subject identifier
     * @param {number} limit - Max conversations
     */
    async getConversations(subjectId, limit = 10) {
        await this.init();
        const all = await this._getAllByIndex('conversations', 'subjectId', subjectId);
        return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    },

    // ============ SETTINGS OPERATIONS ============

    /**
     * Get a setting value
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default if not found
     */
    async getSetting(key, defaultValue = null) {
        await this.init();
        const setting = await this._get('settings', key);
        return setting?.value ?? defaultValue;
    },

    /**
     * Set a setting value
     * @param {string} key - Setting key
     * @param {*} value - Value to store
     */
    async setSetting(key, value) {
        await this.init();
        return this._put('settings', { key, value });
    },

    // ============ GENERIC HELPERS ============

    async _add(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _put(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _getAllByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const index = tx.objectStore(storeName).index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async _delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Clear all data (for development)
     */
    async clearAll() {
        indexedDB.deleteDatabase(DB_NAME);
        db = null;
        console.log('IndexedDB cleared');
    }
};
