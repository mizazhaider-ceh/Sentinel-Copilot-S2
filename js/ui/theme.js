/**
 * ui/theme.js
 * Handles application theming
 */

const THEMES = ['glass', 'dark', 'light'];

export const ThemeManager = {
    init: () => {
        const savedTheme = localStorage.getItem('s2-sentinel-theme') || 'glass';
        ThemeManager.setTheme(savedTheme);
    },

    setTheme: (themeName) => {
        if (!THEMES.includes(themeName)) return;

        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('s2-sentinel-theme', themeName);

        // Update active state in UI if selector exists
        const selector = document.getElementById('theme-selector');
        if (selector) selector.value = themeName;
    }
};
