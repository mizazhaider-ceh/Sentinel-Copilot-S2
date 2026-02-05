/**
 * ui/toast.js
 * Manages toast notifications for user feedback.
 */

export const Toast = {
    /**
     * Show a toast message.
     * @param {string} message - The message to display.
     * @param {string} type - 'info', 'success', 'error'
     */
    show: (message, type = 'info') => {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            error: 'exclamation-triangle'
        };
        const colors = {
            info: 'blue',
            success: 'emerald',
            error: 'red'
        };
        const icon = icons[type] || icons.info;
        const color = colors[type] || colors.info;

        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `glass-effect flex items-center p-4 rounded-lg shadow-lg text-white border-l-4 border-${color}-400 animate-slide-up`;
        toast.innerHTML = `
            <i class="fas fa-${icon} mr-3 text-${color}-400 text-xl"></i>
            <p class="font-medium">${message}</p>
        `;

        container.appendChild(toast);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
};
