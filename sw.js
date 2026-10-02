/**
 * sw.js - S2-Sentinel Copilot Service Worker
 * Provides offline-first caching for the app shell and local assets.
 * API calls (Cerebras / Gemini / local RAG backend) always hit the network.
 */

const CACHE_VERSION = 's2-sentinel-v1';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './css/variables.css',
    './css/base.css',
    './css/components.css',
    './css/layout.css',
    './css/markdown.css',
    './css/animations.css',
    './css/sentinel.css',
    './js/main.js',
    './js/config-s2.js',
    './js/state-manager.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
            .catch((err) => console.error('[SW] Install cache failed:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Never cache API traffic: AI providers and the local RAG backend.
function isApiRequest(url) {
    return url.hostname === 'api.cerebras.ai' ||
        url.hostname === 'generativelanguage.googleapis.com' ||
        url.port === '8765' ||
        url.hostname === 'localhost' && url.port !== '';
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // API traffic: network only.
    if (isApiRequest(url)) return;

    // Same-origin assets: cache first, fall back to network and refresh the cache.
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const network = fetch(request).then((response) => {
                    if (response && response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
                    }
                    return response;
                }).catch(() => cached);
                return cached || network;
            })
        );
    }
});
