/**
 * main.js
 * Application Entry Point & Router for S2-Sentinel Copilot
 * Hash-based SPA navigation
 */

import { BRANDING, SUBJECTS, CONSTANTS } from './config-s2.js';
import { AppState } from './state-manager.js';
import { StorageIDB } from './services/storage-idb.js';
import { Analytics } from './features/analytics.js';
import { RAGEngine } from './features/rag-engine.js';
import { Dashboard } from './views/dashboard.js';
import { Workspace } from './views/workspace.js';
import { Modal } from './ui/modal.js';
import { Toast } from './ui/toast.js';
import { ThemeManager } from './ui/theme.js';

console.log('🔷 [main.js] All imports successful!');

// ═══════════════════════════════════════════════════════════════
// APPLICATION INITIALIZATION
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    console.log(`🛡️ ${BRANDING.appName} v${BRANDING.version} initializing...`);

    try {
        // Initialize core services
        console.log('[Init] Starting StorageIDB...');
        await StorageIDB.init();
        console.log('[Init] StorageIDB ready');

        console.log('[Init] Starting Analytics...');
        await Analytics.init();
        console.log('[Init] Analytics ready');

        console.log('[Init] Starting ThemeManager...');
        ThemeManager.init();
        console.log('[Init] ThemeManager ready');

        console.log('[Init] Starting Modal...');
        Modal.setup();
        console.log('[Init] Modal ready');

        // Initialize PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('[Init] PDF.js worker configured');
        }

        // Setup routing
        setupRouter();

        // Setup global event listeners
        setupGlobalListeners();

        // Check API configuration
        checkApiConfiguration();

        // Initial route
        handleRoute();

        console.log('✅ S2-Sentinel Copilot initialized');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        
        // Show error in UI
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="flex items-center justify-center h-[60vh]">
                    <div class="text-center glass-effect p-8 rounded-2xl max-w-md">
                        <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                        <h2 class="text-xl font-bold text-white mb-2">Initialization Error</h2>
                        <p class="text-gray-400 mb-4">${error.message}</p>
                        <button onclick="location.reload()" class="px-4 py-2 bg-emerald-500 text-white rounded-lg">
                            Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }
});

// ═══════════════════════════════════════════════════════════════
// HASH-BASED ROUTER
// ═══════════════════════════════════════════════════════════════

function setupRouter() {
    window.addEventListener('hashchange', handleRoute);
}

function handleRoute() {
    const hash = window.location.hash || '#/dashboard';
    const [, path, param] = hash.match(/#\/(\w+)\/?(.*)/) || [, 'dashboard', ''];

    console.log(`[Router] Navigating to: ${path}${param ? '/' + param : ''}`);

    // End any existing analytics session
    Analytics.endSession();

    switch (path) {
        case 'subject':
            if (param && SUBJECTS[param]) {
                showWorkspace(param);
            } else {
                showDashboard();
            }
            break;

        case 'dashboard':
        default:
            showDashboard();
            break;
    }
}

function showDashboard() {
    AppState.setState({ 
        currentView: 'dashboard', 
        currentSubject: null 
    });

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        Dashboard.render(mainContent);
    }
}

function showWorkspace(subjectId) {
    AppState.setState({ 
        currentView: 'workspace', 
        currentSubject: subjectId 
    });

    // Start analytics session
    Analytics.startSession(subjectId);

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        Workspace.render(mainContent, subjectId);
    }
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION HELPERS
// ═══════════════════════════════════════════════════════════════

export function navigate(path, subjectId = null) {
    if (path === 'workspace' && subjectId) {
        window.location.hash = `/subject/${subjectId}`;
    } else {
        window.location.hash = '/dashboard';
    }
}

export function navigateToSubject(subjectId) {
    navigate('workspace', subjectId);
}

export function navigateToDashboard() {
    navigate('dashboard');
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

function setupGlobalListeners() {
    // Navigation back button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#back-to-dashboard')) {
            navigateToDashboard();
        }
    });

    // Subject card clicks
    document.addEventListener('click', (e) => {
        const card = e.target.closest('[data-subject]');
        if (card && !card.closest('.tool-item')) {
            const subjectId = card.dataset.subject;
            navigateToSubject(subjectId);
        }
    });

    // Theme toggle
    document.addEventListener('click', (e) => {
        if (e.target.closest('#theme-toggle')) {
            const themes = CONSTANTS.THEMES;
            const current = AppState.get('theme');
            const idx = themes.indexOf(current);
            const next = themes[(idx + 1) % themes.length];
            ThemeManager.setTheme(next);
            AppState.setState({ theme: next });
        }
    });

    // Settings button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#settings-btn')) {
            Modal.toggle('settings-modal', true);
        }
    });

    // API modal save
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#save-api-keys')) {
            await saveApiKeys();
        }
    });

    // Demo mode
    document.addEventListener('click', (e) => {
        if (e.target.closest('#demo-mode-btn')) {
            AppState.setState({ isDemo: true, activeProvider: 'demo' });
            Modal.toggle('api-modal', false);
            Toast.show('Demo mode activated', 'info');
        }
    });

    // Track page visibility for session management
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            Analytics.endSession();
        } else if (AppState.get('currentSubject')) {
            Analytics.startSession(AppState.get('currentSubject'));
        }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
        Analytics.endSession();
    });
}

// ═══════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════

function checkApiConfiguration() {
    const state = AppState.getState();
    const hasApi = state.apiKeys.cerebras || state.apiKeys.gemini;

    // Update header status indicator
    updateApiStatusDisplay();

    // Pre-fill inputs if keys exist
    const cerebrasInput = document.getElementById('cerebras-api-key');
    const geminiInput = document.getElementById('gemini-api-key');
    
    if (cerebrasInput && state.apiKeys.cerebras) {
        cerebrasInput.value = state.apiKeys.cerebras;
    }
    if (geminiInput && state.apiKeys.gemini) {
        geminiInput.value = state.apiKeys.gemini;
    }

    // Show modal if no API configured and not in demo mode
    if (!hasApi && !state.isDemo) {
        setTimeout(() => Modal.toggle('api-modal', true), 500);
    }
}

async function saveApiKeys() {
    const cerebrasKey = document.getElementById('cerebras-api-key')?.value.trim();
    const geminiKey = document.getElementById('gemini-api-key')?.value.trim();

    if (!cerebrasKey && !geminiKey) {
        Toast.show('Please enter at least one API key', 'error');
        return;
    }

    // Test connection
    const saveBtn = document.getElementById('save-api-keys');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    }

    try {
        const { ApiService } = await import('./services/api.js');
        
        if (cerebrasKey) {
            await ApiService.Cerebras.connect(cerebrasKey);
        }
        if (geminiKey) {
            await ApiService.Gemini.connect(geminiKey);
        }

        // Save to state
        AppState.setState({
            apiKeys: { cerebras: cerebrasKey, gemini: geminiKey },
            activeProvider: cerebrasKey ? 'cerebras' : 'gemini',
            isDemo: false
        });

        updateApiStatusDisplay();
        Modal.toggle('api-modal', false);
        Toast.show('API connected successfully!', 'success');

    } catch (error) {
        Toast.show(`Connection failed: ${error.message}`, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-plug"></i> Connect';
        }
    }
}

function updateApiStatusDisplay() {
    const state = AppState.getState();
    const indicator = document.getElementById('api-status-indicator');
    const text = document.getElementById('api-status-text');

    if (!indicator || !text) return;

    if (state.isDemo) {
        indicator.className = 'w-2 h-2 rounded-full bg-yellow-400';
        text.textContent = 'Demo Mode';
    } else if (state.activeProvider) {
        indicator.className = 'w-2 h-2 rounded-full bg-emerald-400';
        text.textContent = state.activeProvider === 'cerebras' ? 'Cerebras' : 'Gemini';
    } else {
        indicator.className = 'w-2 h-2 rounded-full bg-red-400';
        text.textContent = 'Not Connected';
    }
}

// ═══════════════════════════════════════════════════════════════
// GLOBAL EXPORTS (for debugging)
// ═══════════════════════════════════════════════════════════════

window.S2Sentinel = {
    state: AppState,
    analytics: Analytics,
    rag: RAGEngine,
    storage: StorageIDB,
    navigate,
    version: BRANDING.version
};
