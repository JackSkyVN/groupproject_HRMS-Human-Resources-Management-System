/**
 * Tiện ích Thông báo Toast
 */

export function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(container);
    }

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-shield-exclamation',
        danger: 'fas fa-exclamation-triangle',
        warning: 'fas fa-info-circle'
    };

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        danger: '#ef4444',
        warning: '#f59e0b'
    };

    const iconClass = icons[type] || icons.success;
    const color = colors[type] || colors.success;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        padding: 16px 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 10px;
        display: flex;
        gap: 12px;
        align-items: center;
        min-width: 300px;
        animation: slideIn 0.3s ease;
        transition: opacity 0.3s, transform 0.3s;
    `;

    toast.innerHTML = `
        <div style="color: ${color}; font-size: 1.2rem;">
            <i class="${iconClass}"></i>
        </div>
        <div style="flex: 1; color: #1e293b; font-weight: 500;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

export function hideToast(id) {
    const toast = document.getElementById(id);
    if (toast) toast.remove();
}

// Thêm animation CSS nếu chưa có
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}
