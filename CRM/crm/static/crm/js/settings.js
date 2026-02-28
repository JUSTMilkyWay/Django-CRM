// Отслеживание изменений
let changes = {
    updated: [],
    deleted: [],
    new: []
};

// Добавление новой колонки
function addNewColumn() {
    const list = document.getElementById("columnsList");
    const id = "new_" + Date.now();

    const html = `
        <div class="column-item" data-column-id="${id}">
            <div class="column-main">
                <input type="text"
                       class="column-title"
                       value="Новая колонка"
                       maxlength="50">
                <button class="btn-delete"
                        type="button"
                        onclick="deleteColumn('${id}')">
                    Удалить
                </button>
            </div>

            <div class="column-options">
                <label>
                    <input type="checkbox" class="final-stage">
                    Финальная стадия
                </label>
                <label>
                    <input type="checkbox" class="exclude-stage">
                    Исключить из аналитики
                </label>
            </div>

            <div class="column-meta">
                Карточек: 0
            </div>
        </div>
    `;

    list.insertAdjacentHTML("beforeend", html);

    if (!changes.new.find(c => c.tempId === id)) {
        changes.new.push({ tempId: id, title: "Новая колонка", is_final: false, exclude: false });
    }
}

// Удаление колонки
async function deleteColumn(id) {
    // ✅ Асинхронное подтверждение
    const confirmed = await showConfirm("Удалить колонку?");
    if (!confirmed) return;

    const item = document.querySelector(`[data-column-id="${id}"]`);
    if (!item) return;

    if (id.toString().startsWith("new_")) {
        item.remove();
        changes.new = changes.new.filter(c => c.tempId !== id);
    } else {
        const numericId = parseInt(id);
        if (!changes.deleted.includes(numericId)) {
            changes.deleted.push(numericId);
        }
        item.remove();
    }
}

// Сбор всех данных и отправка
function saveAllChanges() {
    const columns = document.querySelectorAll(".column-item:not([style*='line-through'])");

    const data = {
        deleted: changes.deleted,
        updated: [],
        new: []
    };

    columns.forEach((col, index) => {
        const id = col.dataset.columnId;
        const title = col.querySelector(".column-title").value.trim();
        const isFinal = col.querySelector(".final-stage").checked;
        const exclude = col.querySelector(".exclude-stage").checked;

        if (id.startsWith("new_")) {
            data.new.push({
                title,
                is_final: isFinal,
                exclude_from_stats: exclude,
                order: index
            });
        } else {
            const originalTitle = col.querySelector(".column-title").dataset.original;
            if (title !== originalTitle || changes.updated.find(c => c.id === parseInt(id))) {
                data.updated.push({
                    id: parseInt(id),
                    title,
                    is_final: isFinal,
                    exclude_from_stats: exclude,
                    order: index
                });
            }
        }
    });

    fetch("/crm/update_columns/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            // ✅ ЗАМЕНИЛИ alert() НА showNotification()
            showNotification('Настройки сохранены', 'success');
            setTimeout(() => location.reload(), 1200);
        } else {
            // ✅ ЗАМЕНИЛИ alert() НА showNotification()
            showNotification((result.error || 'Не удалось сохранить'), 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showNotification('Ошибка сети: ' + err.message, 'error');
    });
}

// Сброс к колонкам по умолчанию
async function resetToDefault() {
    // ✅ Асинхронное подтверждение
    const confirmed = await showConfirm("Все пользовательские колонки, а также лиды будут удалены. Продолжить?");
    if (!confirmed) return;

    fetch("/crm/reset_columns/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        }
    })
    .then(r => r.json())
    .then(result => {
        if (result.success) {
            showNotification('Колонки сброшены', 'success');
            setTimeout(() => location.reload(), 1200);
        } else {
            showNotification((result.error || 'Не удалось сбросить'), 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showNotification('Ошибка сети: ' + err.message, 'error');
    });
}

// Получение CSRF токена
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


function showConfirm(message) {
    return new Promise((resolve) => {
        // Создаём затемнение
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 99998;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        `;

        // Создаём окно
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.style.cssText = `
            background: var(--bg-modal, #1e2029);
            color: var(--text-primary, #e2e8f0);
            padding: 24px;
            border-radius: 12px;
            box-shadow: var(--shadow-lg, 0 25px 50px rgba(0,0,0,0.5));
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.3s ease;
            border: 1px solid var(--border-color, #2a2f3d);
        `;

        // Текст сообщения
        const text = document.createElement('p');
        text.textContent = message;
        text.style.cssText = `
            margin: 0 0 20px 0;
            font-size: 15px;
            line-height: 1.5;
        `;

        // Кнопки
        const buttons = document.createElement('div');
        buttons.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Отмена';
        cancelBtn.style.cssText = `
            padding: 10px 24px;
            background: var(--bg-tertiary, #2d3748);
            color: var(--text-primary, #e2e8f0);
            border: 1px solid var(--border-color, #2a2f3d);
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        `;
        cancelBtn.onmouseover = () => cancelBtn.style.background = 'var(--border-hover, #3a3f4d)';
        cancelBtn.onmouseout = () => cancelBtn.style.background = 'var(--bg-tertiary, #2d3748)';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Подтвердить';
        confirmBtn.style.cssText = `
            padding: 10px 24px;
            background: var(--btn-danger, #ef4444);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        `;
        confirmBtn.onmouseover = () => confirmBtn.style.background = 'var(--btn-delete-hover, #d32f2f)';
        confirmBtn.onmouseout = () => confirmBtn.style.background = 'var(--btn-danger, #ef4444)';

        // Собираем
        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        modal.appendChild(text);
        modal.appendChild(buttons);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Закрытие
        const close = (result) => {
            overlay.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 200);
        };

        cancelBtn.onclick = () => close(false);
        confirmBtn.onclick = () => close(true);
        overlay.onclick = (e) => { if (e.target === overlay) close(false); };
        document.addEventListener('keydown', function onKey(e) {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', onKey);
                close(false);
            }
        });
    });
}

// Анимации для confirm
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;
document.head.appendChild(style);