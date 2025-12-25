/**
 * Modal Utility
 */

export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

export function closeModal(id) {
    if (id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            modal.remove();
        }
    } else {
        // Close all modals
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    }
}

export function createModal(config) {
    const { title, content, onSubmit, onCancel, submitText = 'Submit', cancelText = 'Cancel' } = config;

    const modalId = 'modal-' + Date.now();

    const modalHTML = `
        <div class="modal-overlay" id="${modalId}" onclick="closeModalOnOverlay(event, '${modalId}')">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" onclick="closeModal('${modalId}')">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="handleModalCancel('${modalId}')">${cancelText}</button>
                    <button class="btn btn-primary" onclick="handleModalSubmit('${modalId}')">${submitText}</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store handlers
    if (onSubmit) window[`modalSubmit_${modalId}`] = onSubmit;
    if (onCancel) window[`modalCancel_${modalId}`] = onCancel;

    setTimeout(() => openModal(modalId), 10);

    return modalId;
}

// Global helpers for onclick
window.closeModal = function (id) {
    closeModal(id);
};

window.closeModalOnOverlay = function (event, modalId) {
    if (event.target.classList.contains('modal-overlay')) {
        closeModal(modalId);
    }
};

window.handleModalSubmit = function (modalId) {
    const handler = window[`modalSubmit_${modalId}`];
    if (handler) handler();
    closeModal(modalId);
};

window.handleModalCancel = function (modalId) {
    const handler = window[`modalCancel_${modalId}`];
    if (handler) handler();
    else closeModal(modalId);
};
