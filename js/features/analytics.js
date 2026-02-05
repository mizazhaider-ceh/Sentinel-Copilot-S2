/**
 * analytics.js
 * Study Analytics & Progress Tracking with Chart.js Integration
 * Tracks study time, quiz scores, and weak topics per subject
 */

import { StorageIDB } from '../services/storage-idb.js';
import { SUBJECTS } from '../config-s2.js';

export const Analytics = {

    charts: {},
    currentSession: null,
    chartJsLoaded: false,

    /**
     * Initialize analytics module
     */
    async init() {
        await StorageIDB.init();
        await this.loadChartJS();
    },

    /**
     * Load Chart.js dynamically
     */
    async loadChartJS() {
        if (typeof Chart !== 'undefined') {
            this.chartJsLoaded = true;
            return;
        }

        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = () => {
                this.chartJsLoaded = true;
                console.log('[Analytics] Chart.js loaded');
                resolve();
            };
            document.head.appendChild(script);
        });
    },

    // ═══════════════════════════════════════════════════════════════
    // SESSION TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Start a study session for a subject
     * @param {string} subjectId - Subject identifier
     */
    startSession(subjectId) {
        // End any existing session first
        if (this.currentSession) {
            this.endSession();
        }

        this.currentSession = {
            subjectId,
            startTime: Date.now(),
            interactions: 0
        };

        console.log(`[Analytics] Session started: ${subjectId}`);
    },

    /**
     * Track an interaction in the current session
     */
    trackInteraction() {
        if (this.currentSession) {
            this.currentSession.interactions++;
        }
    },

    /**
     * End the current study session and persist analytics
     */
    async endSession() {
        if (!this.currentSession) return;

        const duration = Math.floor((Date.now() - this.currentSession.startTime) / 60000); // minutes

        // Only record if session was meaningful (> 1 minute)
        if (duration >= 1) {
            await StorageIDB.updateAnalytics(this.currentSession.subjectId, {
                studyTime: duration,
                session: {
                    timestamp: Date.now(),
                    duration,
                    interactions: this.currentSession.interactions
                }
            });

            console.log(`[Analytics] Session ended: ${this.currentSession.subjectId}, ${duration} min`);
        }

        this.currentSession = null;
    },

    // ═══════════════════════════════════════════════════════════════
    // QUIZ TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record a quiz score
     * @param {string} subjectId - Subject identifier
     * @param {number} score - Score achieved
     * @param {number} total - Total possible score
     * @param {Array} weakTopics - Topics answered incorrectly
     */
    async recordQuiz(subjectId, score, total, weakTopics = []) {
        await StorageIDB.updateAnalytics(subjectId, {
            quizScore: score,
            quizTotal: total
        });

        // Track weak topics
        for (const topic of weakTopics) {
            await StorageIDB.updateAnalytics(subjectId, {
                weakTopic: topic
            });
        }

        console.log(`[Analytics] Quiz recorded: ${subjectId}, ${score}/${total}`);
    },

    // ═══════════════════════════════════════════════════════════════
    // CHART RENDERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render the complete analytics dashboard
     * @param {string} containerId - Container element ID
     */
    async renderDashboard(containerId) {
        await this.init();
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('[Analytics] Container not found:', containerId);
            return;
        }

        const allAnalytics = await StorageIDB.getAllAnalytics();
        container.innerHTML = '';

        // Create grid layout
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6';
        container.appendChild(grid);

        // Study Time Pie Chart
        await this.renderStudyTimePie(grid, allAnalytics);

        // Quiz Performance Line Chart
        await this.renderQuizPerformance(grid, allAnalytics);

        // Subject Stats Cards
        await this.renderSubjectStats(container, allAnalytics);
    },

    /**
     * Render study time distribution pie chart
     */
    async renderStudyTimePie(container, analyticsData) {
        if (!this.chartJsLoaded) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'glass-effect p-6 rounded-xl';
        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-clock"></i> Study Time Distribution
            </h3>
            <canvas id="study-time-pie" height="250"></canvas>
        `;
        container.appendChild(wrapper);

        const ctx = document.getElementById('study-time-pie').getContext('2d');
        
        const labels = [];
        const data = [];
        const colors = [];

        Object.keys(SUBJECTS).forEach(subjectId => {
            const analytics = analyticsData.find(a => a.subjectId === subjectId);
            const subject = SUBJECTS[subjectId];
            labels.push(subject.name.split(' ')[0]); // Short name
            data.push(analytics?.studyTime || 0);
            colors.push(subject.color);
        });

        // Destroy existing chart
        if (this.charts['study-time-pie']) {
            this.charts['study-time-pie'].destroy();
        }

        this.charts['study-time-pie'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#1a1a2e',
                    borderWidth: 3,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 11 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${this.formatTime(ctx.raw)}`
                        }
                    }
                }
            }
        });
    },

    /**
     * Render quiz performance line chart
     */
    async renderQuizPerformance(container, analyticsData) {
        if (!this.chartJsLoaded) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'glass-effect p-6 rounded-xl';
        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-chart-line"></i> Quiz Performance Trends
            </h3>
            <canvas id="quiz-performance" height="250"></canvas>
        `;
        container.appendChild(wrapper);

        const ctx = document.getElementById('quiz-performance').getContext('2d');
        
        const datasets = [];

        Object.keys(SUBJECTS).forEach(subjectId => {
            const analytics = analyticsData.find(a => a.subjectId === subjectId);
            const subject = SUBJECTS[subjectId];

            if (analytics?.quizScores?.length > 0) {
                const scores = analytics.quizScores.map(q => 
                    Math.round((q.score / q.total) * 100)
                );

                datasets.push({
                    label: subject.name.split(' ')[0],
                    data: scores,
                    borderColor: subject.color,
                    backgroundColor: subject.color + '30',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }
        });

        const maxQuizzes = Math.max(...datasets.map(d => d.data.length), 5);
        const labels = Array.from({ length: maxQuizzes }, (_, i) => `Q${i + 1}`);

        // Destroy existing chart
        if (this.charts['quiz-performance']) {
            this.charts['quiz-performance'].destroy();
        }

        this.charts['quiz-performance'] = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { 
                            color: '#e0e0e0',
                            callback: (v) => v + '%'
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { color: '#e0e0e0' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e0e0e0', padding: 15 }
                    }
                }
            }
        });
    },

    /**
     * Render subject statistics cards
     */
    async renderSubjectStats(container, analyticsData) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mt-6';
        wrapper.innerHTML = `
            <h3 class="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <i class="fas fa-trophy"></i> Subject Progress
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="subject-stats-grid"></div>
        `;
        container.appendChild(wrapper);

        const grid = document.getElementById('subject-stats-grid');

        Object.keys(SUBJECTS).forEach(subjectId => {
            const analytics = analyticsData.find(a => a.subjectId === subjectId) || {};
            const subject = SUBJECTS[subjectId];

            const avgScore = analytics.quizScores?.length > 0
                ? Math.round(analytics.quizScores.reduce((a, q) => a + (q.score / q.total) * 100, 0) / analytics.quizScores.length)
                : 0;

            const card = document.createElement('div');
            card.className = 'glass-effect p-4 rounded-xl border-l-4';
            card.style.borderColor = subject.color;
            card.innerHTML = `
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: ${subject.color}30;">
                        <i class="fas ${subject.icon}" style="color: ${subject.color};"></i>
                    </div>
                    <div>
                        <div class="font-semibold text-sm text-white">${subject.name.split(' ').slice(0, 2).join(' ')}</div>
                        <div class="text-xs text-gray-400">${subject.credits} ECTS</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="text-center p-2 rounded-lg bg-black/30">
                        <div class="text-gray-400">Study Time</div>
                        <div class="font-bold text-emerald-400">${this.formatTime(analytics.studyTime || 0)}</div>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-black/30">
                        <div class="text-gray-400">Avg Score</div>
                        <div class="font-bold" style="color: ${avgScore >= 70 ? '#22c55e' : avgScore >= 50 ? '#f59e0b' : '#ef4444'}">
                            ${avgScore}%
                        </div>
                    </div>
                </div>
                ${analytics.weakTopics?.length > 0 ? `
                    <div class="mt-3 text-xs">
                        <div class="text-gray-400 mb-1">Focus Areas:</div>
                        <div class="flex flex-wrap gap-1">
                            ${analytics.weakTopics.slice(0, 2).map(t => 
                                `<span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">${t}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
            grid.appendChild(card);
        });
    },

    // ═══════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Format minutes to human readable
     */
    formatTime(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    },

    /**
     * Get summary statistics
     */
    async getSummary() {
        const allAnalytics = await StorageIDB.getAllAnalytics();
        
        const totalTime = allAnalytics.reduce((acc, a) => acc + (a.studyTime || 0), 0);
        const totalQuizzes = allAnalytics.reduce((acc, a) => acc + (a.quizScores?.length || 0), 0);
        const avgScore = allAnalytics.length > 0
            ? Math.round(
                allAnalytics
                    .filter(a => a.quizScores?.length > 0)
                    .reduce((acc, a) => {
                        const avg = a.quizScores.reduce((s, q) => s + (q.score / q.total) * 100, 0) / a.quizScores.length;
                        return acc + avg;
                    }, 0) / allAnalytics.filter(a => a.quizScores?.length > 0).length
            ) || 0
            : 0;

        return {
            totalStudyTime: this.formatTime(totalTime),
            totalStudyMinutes: totalTime,
            totalQuizzes,
            averageScore: avgScore,
            subjectsActive: allAnalytics.filter(a => a.studyTime > 0).length,
            lastActive: Math.max(...allAnalytics.map(a => a.lastAccessed || 0)) || null
        };
    },

    /**
     * Export analytics data
     */
    async exportData() {
        const allAnalytics = await StorageIDB.getAllAnalytics();
        return JSON.stringify(allAnalytics, null, 2);
    }
};
