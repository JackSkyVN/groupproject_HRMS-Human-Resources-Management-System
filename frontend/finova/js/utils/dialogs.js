/**
 * Hệ thống Dialog Tùy chỉnh - Thay thế confirm/prompt/alert mặc định của browser
 */

// Tạo dialog confirm tùy chỉnh
export function showConfirmDialog(message, onConfirm, onCancel) {
    // Xóa dialog hiện tại nếu có
    const existing = document.getElementById('custom-confirm-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'custom-confirm-dialog';
    dialog.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s;">
            <div style="background: white; border-radius: 16px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s;">
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 16px; line-height: 1.5;">${message}</div>
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                    <button id="dialog-cancel" style="padding: 10px 24px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #64748b; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancel</button>
                    <button id="dialog-confirm" style="padding: 10px 24px; border-radius: 8px; border: none; background: #3b82f6; color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;">OK</button>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            #dialog-confirm:hover { background: #2563eb; transform: translateY(-1px); }
            #dialog-cancel:hover { background: #f1f5f9; }
        </style>
    `;

    document.body.appendChild(dialog);

    const confirmBtn = dialog.querySelector('#dialog-confirm');
    const cancelBtn = dialog.querySelector('#dialog-cancel');

    const cleanup = () => {
        dialog.style.animation = 'fadeOut 0.2s';
        setTimeout(() => dialog.remove(), 200);
    };

    confirmBtn.onclick = () => {
        cleanup();
        if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
        cleanup();
        if (onCancel) onCancel();
    };

    // Đóng khi click backdrop
    dialog.onclick = (e) => {
        if (e.target === dialog) {
            cleanup();
            if (onCancel) onCancel();
        }
    };
}

// Tạo dialog prompt tùy chỉnh
export function showPromptDialog(message, defaultValue = '', onSubmit, onCancel) {
    const existing = document.getElementById('custom-prompt-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'custom-prompt-dialog';
    dialog.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s;">
            <div style="background: white; border-radius: 16px; padding: 32px; max-width: 450px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s;">
                <div style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 16px; line-height: 1.5;">${message}</div>
                <textarea id="prompt-input" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 80px; margin-bottom: 20px;" placeholder="Enter your response...">${defaultValue}</textarea>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="prompt-cancel" style="padding: 10px 24px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; color: #64748b; font-weight: 600; cursor: pointer;">Cancel</button>
                    <button id="prompt-submit" style="padding: 10px 24px; border-radius: 8px; border: none; background: #3b82f6; color: white; font-weight: 600; cursor: pointer;">Submit</button>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            #prompt-submit:hover { background: #2563eb; }
            #prompt-cancel:hover { background: #f1f5f9; }
            #prompt-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        </style>
    `;

    document.body.appendChild(dialog);

    const input = dialog.querySelector('#prompt-input');
    const submitBtn = dialog.querySelector('#prompt-submit');
    const cancelBtn = dialog.querySelector('#prompt-cancel');

    input.focus();
    input.select();

    const cleanup = () => {
        dialog.style.animation = 'fadeOut 0.2s';
        setTimeout(() => dialog.remove(), 200);
    };

    submitBtn.onclick = () => {
        const value = input.value.trim();
        cleanup();
        if (onSubmit) onSubmit(value);
    };

    cancelBtn.onclick = () => {
        cleanup();
        if (onCancel) onCancel();
    };

    // Submit khi Enter (Ctrl+Enter cho newline)
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            submitBtn.click();
        }
    };

    dialog.onclick = (e) => {
        if (e.target === dialog) {
            cleanup();
            if (onCancel) onCancel();
        }
    };
}

// Tạo dialog alert tùy chỉnh (thông báo info)
export function showAlertDialog(message) {
    const existing = document.getElementById('custom-alert-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'custom-alert-dialog';
    dialog.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.2s;">
            <div style="background: white; border-radius: 16px; padding: 32px; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s;">
                <div style="font-size: 16px; font-weight: 500; color: #1e293b; margin-bottom: 24px; line-height: 1.6; white-space: pre-line;">${message}</div>
                <div style="display: flex; justify-content: flex-end;">
                    <button id="alert-ok" style="padding: 10px 32px; border-radius: 8px; border: none; background: #3b82f6; color: white; font-weight: 600; cursor: pointer;">OK</button>
                </div>
            </div>
        </div>
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            #alert-ok:hover { background: #2563eb; }
        </style>
    `;

    document.body.appendChild(dialog);

    const okBtn = dialog.querySelector('#alert-ok');

    const cleanup = () => {
        dialog.style.animation = 'fadeOut 0.2s';
        setTimeout(() => dialog.remove(), 200);
    };

    okBtn.onclick = cleanup;
    dialog.onclick = (e) => {
        if (e.target === dialog) cleanup();
    };
}
