/**
 * ui/modal.js
 * Modern <dialog> API handler for modals.
 * Uses native showModal() and close() methods.
 */

export const Modal = {
    /**
     * Show or hide a dialog modal
     * @param {string} modalId - The dialog element ID
     * @param {boolean} show - true to open, false to close
     */
    toggle: (modalId, show) => {
        const dialog = document.getElementById(modalId);
        if (!dialog || !(dialog instanceof HTMLDialogElement)) {
            console.warn(`[Modal] Element #${modalId} not found or not a <dialog>`);
            return;
        }
        
        if (show) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else {
            dialog.close();
        }
    },

    /**
     * Open a modal
     * @param {string} modalId - The dialog element ID
     */
    open: (modalId) => {
        Modal.toggle(modalId, true);
    },

    /**
     * Close a modal
     * @param {string} modalId - The dialog element ID
     */
    close: (modalId) => {
        Modal.toggle(modalId, false);
    },

    /**
     * Check if modal is open
     * @param {string} modalId - The dialog element ID
     * @returns {boolean}
     */
    isOpen: (modalId) => {
        const dialog = document.getElementById(modalId);
        return dialog?.open ?? false;
    },

    /**
     * Setup is handled in index.html via inline module script
     */
    setup: () => {
        console.log('[Modal] Native dialog API ready');
    }
};
