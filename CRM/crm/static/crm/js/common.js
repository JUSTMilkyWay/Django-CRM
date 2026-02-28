// static/js/common.js

// ======== УВЕДОМЛЕНИЯ ========
function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 1000);
}

// ======== КАСТОМНОЕ ПОДТВЕРЖДЕНИЕ ========
function showConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6); z-index: 99998;
            display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease;
        `;

        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.style.cssText = `
            background: var(--bg-modal, #1e2029);
            color: var(--text-primary, #e2e8f0);
            padding: 24px; border-radius: 12px;
            box-shadow: var(--shadow-lg, 0 25px 50px rgba(0,0,0,0.5));
            max-width: 400px; width: 90%; text-align: center;
            animation: slideUp 0.3s ease;
            border: 1px solid var(--border-color, #2a2f3d);
        `;

        const text = document.createElement('p');
        text.textContent = message;
        text.style.margin = '0 0 20px 0';

        const buttons = document.createElement('div');
        buttons.style.cssText = 'display: flex; gap: 12px; justify-content: center;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Отмена';
        cancelBtn.style.cssText = `
            padding: 10px 24px; background: var(--bg-tertiary, #2d3748);
            color: var(--text-primary, #e2e8f0); border: 1px solid var(--border-color, #2a2f3d);
            border-radius: 8px; cursor: pointer; font-weight: 500;
        `;

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Подтвердить';
        confirmBtn.style.cssText = `
            padding: 10px 24px; background: var(--btn-danger, #ef4444);
            color: #fff; border: none; border-radius: 8px;
            cursor: pointer; font-weight: 500;
        `;

        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        modal.appendChild(text);
        modal.appendChild(buttons);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const close = (result) => {
            overlay.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => { overlay.remove(); resolve(result); }, 200);
        };

        cancelBtn.onclick = () => close(false);
        confirmBtn.onclick = () => close(true);
        overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    });
}

// Анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
`;
document.head.appendChild(style);