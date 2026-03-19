//kanban.js
// ======== НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ ========
const USER_PERMS = JSON.parse(
    document.getElementById('user-permissions')?.textContent || '{}'
);

function formatPhone(phone) {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
        return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
    }
    if (digits.length === 10) {
        return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
    }
    return phone;
}

function formatAmountInput(input) {
    const raw = input.value.replace(/[^\d,]/g, ''); // Только цифры и запятая
    input.dataset.raw = raw; // Сохраняем "сырое" значение
    // Не форматируем на лету, чтобы не "скакал" курсор
}

// Форматирование при потере фокуса
function formatAmountOnBlur(input) {
    const raw = input.dataset.raw || input.value.replace(/[^\d,]/g, '');
    const formatted = formatAmountDisplay(raw);
    input.value = formatted;
    input.dataset.raw = cleanAmountValue(formatted).toString();
}

function formatAmountDisplay(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

// Очистка числа от пробелов для отправки на сервер: "1 000 000" → 1000000
function cleanAmountValue(value) {
    if (!value) return 0;
    const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function unformatNumber(value) {
    if (!value) return '';
    return String(value).replace(/\s/g, '').replace(',', '.');
}

// ======== КОНФИГУРАЦИЯ ПОЛЕЙ КАРТОЧКИ ========
const LEAD_CARD_FIELDS = {
    inn: {
        label: 'ИНН',
        visible: (data) => USER_PERMS.show_inn !== false && data.inn,
    },
    contact_person: {
        label: 'Контактное лицо',
        icon: null,
        visible: (data) => USER_PERMS.show_contact_person !== false && data.contact_person
    },
    contact_phone: {
        label: 'Контактный телефон:',
        icon: null,
        visible: (data) => USER_PERMS.show_phone !== false && data.contact_phone,
        format: (val) => {
           if (!val) return '';
            // Оставляем только цифры
            const digits = val.replace(/\D/g, '');
            if (digits.length === 11 && digits.startsWith('7')) {
                return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
            }
            if (digits.length === 11 && digits.startsWith('8')) {
                return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
            }
            return val;
        }
    },
    contact_email: {
        label: 'Email',
        icon: null,
        visible: (data) => USER_PERMS.show_email !== false && data.contact_email
    },
    city: {
        label: 'Город',
        icon: null,
        visible: (data) => USER_PERMS.show_city !== false && data.city
    },
    source: {
        label: 'Источник',
        icon: null,
        visible: (data) => USER_PERMS.show_source !== false && data.source
    },
    partner_name: {
        label: 'Партнёр',
        icon: null,
        visible: (data) => USER_PERMS.show_partner && data.partner_name
    }
};

// ======== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        for (let cookie of document.cookie.split(';')) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Рендер одного поля
function renderField(value, fieldKey, label) {
    if (!value) return '';
    return `
    <div class="card-field" data-key="${fieldKey}">
        <span class="field-label">${label}:</span>
        <span class="field-value">${escapeHtml(value)}</span>
    </div>`;
}

// ======== РЕНДЕР КАРТОЧКИ ========
function renderLeadCard(data) {
    const priority = data.priority || '';
    const priorityClass = priority || 'not_set';

    const card = document.createElement('div');
    card.className = `kanban-card priority-${priorityClass}`;
    card.dataset.id = data.id;
    card.dataset.priority = priority;
    card.draggable = true;
    card.ondragstart = (e) => drag(e);

    card.onclick = (e) => {
        if (!e.target.closest('.card-action-btn')) {
            editLead(data.id);
        }
    };

    // Сумма сделки
    const amountFormatted = data.total_amount && USER_PERMS.show_amount !== false
        ? Number(data.total_amount).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽'
        : null;

    // Генерация полей через конфиг
    const fieldsHtml = Object.entries(LEAD_CARD_FIELDS)
        .filter(([key, cfg]) => cfg.visible?.(data) && data[key])
        .map(([key, cfg]) => {
            const value = cfg.format ? cfg.format(data[key]) : data[key];
            return renderField(value, key, cfg.label);
        })
        .join('');

    card.innerHTML = `
        <div class="card-header">
            <div class="lead-info">
                <div class="lead-name">${escapeHtml(data.company_name || 'Новый лид')}</div>
            </div>
            <div class="card-actions">
                <button class="card-action-btn edit" title="Редактировать">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="card-action-btn delete" title="Удалить">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>

        ${amountFormatted ? `
        <div class="card-amount" data-key="total_amount">
            <span class="amount-value">${amountFormatted}</span>
        </div>` : ''}

        <div class="card-fields">
            ${fieldsHtml}
        </div>

        <div class="card-footer">
            <span class="priority-badge ${priorityClass}">
                ${escapeHtml(data.priority_display || 'Не назначен')}
            </span>
            <span class="card-date">${escapeHtml(data.created_at || '')}</span>
        </div>
    `;

    // Кнопки
    card.querySelector('.edit').onclick = (e) => { e.stopPropagation(); editLead(data.id); };
    card.querySelector('.delete').onclick = (e) => { e.stopPropagation(); confirmDelete(data.id); };

    return card;
}

// ======== ОБНОВЛЕНИЕ КАРТОЧКИ ========
function updateCardOnBoard(leadId, data) {
    const card = document.querySelector(`.kanban-card[data-id='${leadId}']`);
    if (!card) return;

    // Название компании
    const leadName = card.querySelector('.lead-name');
    if (leadName) leadName.textContent = data.company_name || 'Новый лид';

    // Сумма сделки
    const amountContainer = card.querySelector('.card-amount');
    if (data.total_amount && USER_PERMS.show_amount !== false) {
        const formatted = Number(data.total_amount).toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽';
        if (!amountContainer) {
            const div = document.createElement('div');
            div.className = 'card-amount';
            div.dataset.key = 'total_amount';
            div.innerHTML = `<span class="amount-value">${formatted}</span>`;
            const header = card.querySelector('.card-header');
            if (header) header.insertAdjacentElement('afterend', div);
        } else {
            amountContainer.querySelector('.amount-value').textContent = formatted;
        }
    } else if (amountContainer) {
        amountContainer.remove();
    }

    // Поля через конфиг
    const fieldsContainer = card.querySelector('.card-fields');
    if (fieldsContainer) {
        Object.entries(LEAD_CARD_FIELDS).forEach(([key, cfg]) => {
            let el = fieldsContainer.querySelector(`.card-field[data-key='${key}']`);
            const shouldShow = cfg.visible?.(data) && data[key];
            const value = cfg.format ? cfg.format(data[key]) : data[key];

            if (shouldShow && value) {
                if (!el) {
                    el = document.createElement('div');
                    el.className = 'card-field';
                    el.dataset.key = key;
                    el.innerHTML = `
                        <span class="field-label">${cfg.label}:</span>
                        <span class="field-value">${escapeHtml(value)}</span>`;
                    fieldsContainer.appendChild(el);
                } else {
                    const valSpan = el.querySelector('.field-value');
                    if (valSpan) valSpan.textContent = value;
                }
            } else if (el) {
                el.remove(); // Скрыть поле, если больше не должно показываться
            }
        });
    }

    // Приоритет — карточка
    if (data.priority) {
        const priorityClass = data.priority || 'not_set';
        card.dataset.priority = priorityClass;
        card.classList.remove('priority-not_set', 'priority-low', 'priority-high', 'priority-critical');
        card.classList.add(`priority-${priorityClass}`);
    }

    // ✅ НОВОЕ: Приоритет — бейдж внутри карточки
    const badge = card.querySelector('.priority-badge');
    if (badge && data.priority) {
        // 1. Обновляем классы бейджа
        badge.classList.remove('not_set', 'low', 'high', 'critical');
        badge.classList.add(data.priority);

        // 2. Обновляем текст бейджа
        const labels = {
            'not_set': 'Не обозначен',
            'low': 'Низкий',
            'high': 'Высокий',
            'critical': 'Критический'
        };
        badge.textContent = labels[data.priority] || 'Не обозначен';
    }

    // Перепривязка кнопок
    const editBtn = card.querySelector('.edit');
    if (editBtn) editBtn.onclick = (e) => { e.stopPropagation(); editLead(leadId); };
    const deleteBtn = card.querySelector('.delete');
    if (deleteBtn) deleteBtn.onclick = (e) => { e.stopPropagation(); confirmDelete(leadId); };
}

// ======== ДОБАВЛЕНИЕ КАРТОЧКИ ========
function addCard(button, columnId) {
    fetch(`add_lead/${columnId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) { alert(data.error); return; }

        const container = button.nextElementSibling;
        const card = renderLeadCard(data);
        container.appendChild(card);

        const columnCount = button.parentElement.querySelector('.column-count');
        columnCount.textContent = parseInt(columnCount.textContent) + 1;

        editLead(data.id);
    })
    .catch(err => { console.error(err); alert('Ошибка при создании лида'); });
}

// ======== УДАЛЕНИЕ ЛИДА ========
async function confirmDelete(leadId) {
    // ✅ Правильная проверка: есть ли showConfirm
    let confirmed = false;
    if (typeof showConfirm === 'function') {
        confirmed = await showConfirm('Вы уверены, что хотите удалить этот лид?');
    } else {
        confirmed = confirm('Вы уверены, что хотите удалить этот лид?');
    }

    if (!confirmed) return;

    fetch(`/crm/delete_lead/${leadId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => {
        if (response.ok) {
            showNotification('Лид удалён', 'success');
            if (currentLeadId === leadId) {
                closeModal();
            }
            setTimeout(() => location.reload(), 500);
        } else {
            return response.text().then(text => {
                throw new Error(`Ошибка ${response.status}: ${text}`);
            });
        }
    })
    .catch(error => {
        console.error('Ошибка удаления:', error);
        showNotification('Ошибка при удалении: ' + error.message, 'error');
    });
}


document.head.insertAdjacentHTML('beforeend', `
<style>
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
</style>
`);

// ======== МОДАЛЬНОЕ ОКНО ========
let currentLeadId = null;

function editLead(leadId) {
    currentLeadId = leadId;

    fetch(`get_lead/${leadId}/`)
    .then(resp => resp.json())
    .then(data => {
        updateLegalNameHeader(data.legal_name);

        const fields = [
            'company_name','legal_form','legal_name','inn','ogrn','director_fio',
            'contact_person','contact_phone','contact_email','phone','email',
            'address','city','partner_name','partner_position','partner_phone',
            'website','source','priority','comment', 'total_amount',
        ];

        fields.forEach(field => {
            const el = document.getElementById(`modal_${field}`);
            if (!el) return;
            el.value = data[field] || '';
        });

        try {
            const amountEl = document.getElementById('modal_total_amount');
            if (amountEl && data.total_amount) {
                const formatted = formatAmountDisplay(data.total_amount);
                amountEl.value = formatted;
                amountEl.dataset.raw = cleanAmountValue(formatted).toString();
            }
        } catch (e) {
            console.warn('⚠️ Ошибка форматирования суммы:', e);
        }

        document.getElementById('leadModal').style.display = 'block';
    });
}

function closeModal() {
    document.getElementById('leadModal').style.display = 'none';
}

function updateLegalNameHeader(name) {
    const el = document.getElementById('modal_legal_name_base');
    if (el) {
        el.textContent = name || 'Новый лид';
        el.style.display = 'block';
    }
}

// ======== DRAG & DROP ========
let dragged;
function drag(event) {
    dragged = event.currentTarget;
    event.dataTransfer.setData("text/plain","");
    dragged.classList.add('dragging');
}
function allowDrop(event) { event.preventDefault(); }

// Обновление статистики колонки (сумма + количество)
// Обновление статистики колонки (сумма + количество)
function updateColumnStats(columnId) {
    // ✅ Надёжный поиск по data-атрибуту
    const column = document.querySelector(`.kanban-column[data-column-id="${columnId}"]`);
    if (!column) return;

    const cards = column.querySelectorAll('.kanban-card');

    // ✅ Считаем количество
    const count = cards.length;
    const countEl = column.querySelector('.column-count');
    if (countEl) {
        countEl.textContent = count;
    }

    // ✅ Считаем сумму
    let total = 0;
    cards.forEach(card => {
        const amountEl = card.querySelector('.card-amount .amount-value');
        if (amountEl) {
            // Очищаем строку "1 000 000 ₽" → 1000000
            const raw = amountEl.textContent.replace(/[^\d]/g, '');
            total += parseInt(raw) || 0;
        }
    });

    // ✅ Форматируем и обновляем сумму
    const sumEl = column.querySelector('.column-sum');
    if (sumEl) {
        sumEl.textContent = total.toLocaleString('ru-RU') + ' ₽';

        // ✅ Анимация изменения
        sumEl.classList.add('updated');
        setTimeout(() => sumEl.classList.remove('updated'), 300);
    }
}

function drop(event, columnId) {
    event.preventDefault();
    if (!dragged) return;

    const oldColumn = dragged.closest('.kanban-column[data-column-id]');
    const oldColumnId = oldColumn?.dataset.columnId;

    const container = event.currentTarget.querySelector('.kanban-cards');

    const afterElement = getDragAfterElement(container, event.clientY);

    if (afterElement == null) {
        container.appendChild(dragged);
    } else {
        container.insertBefore(dragged, afterElement);
    }

    const cards = container.querySelectorAll('.kanban-card');
    const leadOrder = Array.from(cards).map(card => ({
        id: parseInt(card.dataset.id)
    }));

    fetch(`move_lead/${dragged.dataset.id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            column_id: columnId,
            lead_order: leadOrder
        }),
        credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(d => {
        console.log('Moved:', d);
        if (oldColumnId && oldColumnId !== String(columnId)) {
            updateColumnStats(oldColumnId);
        }
        updateColumnStats(String(columnId));
    })
    .catch(e => console.error(e));

    document.addEventListener('dragend', () => {
        if (dragged) {
            dragged.classList.remove('dragging');
            dragged = null;
        }
    }, { once: true });
}

// ✅ Вспомогательная функция: находит карточку, перед которой нужно вставить
function getDragAfterElement(container, y) {
    // Берём все карточки КРОМЕ той, которую тащим
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        // Расстояние от курсора до центра карточки
        const offset = y - box.top - box.height / 2;

        // Нас интересуют только карточки, которые НИЖЕ курсора (offset < 0)
        // Ищем ту, у которой offset отрицательный и ближе всего к 0
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ======== ПРИОРИТЕТЫ ========
function applyPriorityColors(){
    document.querySelectorAll('.kanban-card').forEach(card=>{
        card.classList.remove('priority-not_set','priority-low','priority-high','priority-critical');
        card.classList.add(`priority-${card.dataset.priority||''}`);
    });
}
document.addEventListener('DOMContentLoaded', applyPriorityColors);

document.addEventListener('DOMContentLoaded', () => {
    const innInput = document.getElementById('modal_inn');
    if(innInput){
        innInput.addEventListener('input', (e) => {
            // Оставляем только цифры
            e.target.value = e.target.value.replace(/\D/g, '');

            // Визуальная подсказка о длине
            const len = e.target.value.length;
            if(len > 0 && len !== 10 && len !== 12){
                e.target.style.borderColor = 'var(--btn-warning, #f57c00)';
            } else {
                e.target.style.borderColor = '';
            }
        });

        innInput.addEventListener('blur', () => {
            // Убираем подсветку при потере фокуса
            innInput.style.borderColor = '';
        });
    }

    // Инициализация приоритетов
    applyPriorityColors();
});

// ======== СОХРАНЕНИЕ ЛИДА ========
function saveLead() {
    if (!currentLeadId) return;

    const data = {};
    const fields = {
        company_name: 'Название компании',
        legal_form: 'Форма организации',
        legal_name: 'Юридическое название',
        inn: 'ИНН',
        ogrn: 'ОГРН',
        total_amount: 'Сумма сделки',
        director_fio: 'ФИО директора',
        contact_person: 'Контактное лицо',
        contact_phone: 'Телефон контакта',
        contact_email: 'Email контакта',
        phone: 'Телефон',
        email: 'Email',
        address: 'Адрес',
        city: 'Город',
        partner_name: 'Партнёр',
        partner_position: 'Должность партнёра',
        partner_phone: 'Телефон партнёра',
        website: 'Сайт',
        source: 'Источник',
        priority: 'Приоритет',
        comment: 'Комментарий'
    };

    for (const key in fields) {
        const el = document.getElementById(`modal_${key}`);
        if (!el) continue;
        if (key === 'total_amount') {
            const rawValue = el.dataset.raw || unformatNumber(el.value);
            data[key] = parseFloat(rawValue) || 0;
        } else {
            data[key] = el.value.trim();
        }
    }

    // ✅ ВАЛИДАЦИЯ ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ
    const required = ['company_name', 'legal_form', 'legal_name'];
    const missing = required.filter(f => !data[f]);
    if (missing.length) {
        showNotification('Заполните: ' + missing.map(f => fields[f]).join(', '), 'error');
        return;
    }

    // ✅ ВАЛИДАЦИЯ ИНН (если заполнен)
    if (data.inn) {
        const inn = data.inn.replace(/\D/g, ''); // Только цифры
        if (!/^\d+$/.test(inn)) {
            showNotification('ИНН должен содержать только цифры', 'error');
            document.getElementById('modal_inn')?.focus();
            return;
        }
        if (inn.length !== 10 && inn.length !== 12) {
            showNotification('ИНН должен быть 10 или 12 цифр', 'error');
            document.getElementById('modal_inn')?.focus();
            // Подсветка поля
            const innInput = document.getElementById('modal_inn');
            if (innInput) {
                innInput.classList.add('input-error');
                setTimeout(() => innInput.classList.remove('input-error'), 2000);
            }
            return;
        }
        // Сохраняем очищенный ИНН
        data.inn = inn;
    }

    // ✅ ВАЛИДАЦИЯ ОГРН (опционально, если заполнен)
    if (data.ogrn) {
        const ogrn = data.ogrn.replace(/\D/g, '');
        if (!/^\d+$/.test(ogrn) || (ogrn.length !== 13 && ogrn.length !== 15)) {
            showNotification('ОГРН должен быть 13 или 15 цифр', 'error');
            document.getElementById('modal_ogrn')?.focus();
            return;
        }
        data.ogrn = ogrn;
    }

    // ✅ ОТПРАВКА НА СЕРВЕР
    fetch(`update_lead/${currentLeadId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
        if (result.error) {
            showNotification('Ошибка: ' + result.error, 'error');
        } else {
            updateCardOnBoard(currentLeadId, data);
            updateLegalNameHeader(data.legal_name);
            showNotification('Сохранено!', 'success');
            applyPriorityColors();

            // Обновляем статистику колонки
            const card = document.querySelector(`.kanban-card[data-id="${currentLeadId}"]`);
            if (card) {
                const column = card.closest('.kanban-column[data-column-id]');
                const columnId = column?.dataset.columnId;
                if (columnId) {
                    updateColumnStats(columnId);
                }
            }
        }
    })
    .catch(err => {
        console.error(err);
        showNotification('Ошибка сети: ' + err.message, 'error');
    });
}

// ======== CHECKO API ========
function makeRequestChecko(){
    const innInput = document.getElementById('modal_inn');
    const inn = innInput?.value.trim();

    // ✅ 1. Проверка: поле не пустое
    if(!inn){
        innInput?.focus();
        showNotification('Введите ИНН', 'error');
        return;
    }

    // ✅ 2. Проверка: только цифры
    if(!/^\d+$/.test(inn)){
        innInput?.focus();
        showNotification('ИНН должен содержать только цифры', 'error');
        return;
    }

    // ✅ 3. Проверка: длина (10 для ЮЛ, 12 для ИП)
    if(inn.length !== 10 && inn.length !== 12){
        innInput?.focus();
        showNotification('ИНН должен быть 10 или 12 цифр', 'error');
        return;
    }

    const button = document.querySelector('.api-checko-btn');
    const txt = button?.textContent;

    // ✅ Блокируем кнопку на время запроса
    if(button){
        button.textContent = 'Загрузка...';
        button.disabled = true;
    }

    fetch('/companies/api/get_company/',{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
            'X-CSRFToken':getCookie('csrftoken'),
            'X-Requested-With':'XMLHttpRequest'
        },
        body:JSON.stringify({inn})
    })
    .then(r => {
        if(!r.ok){
            throw new Error(`Ошибка сервера: ${r.status}`);
        }
        return r.json();
    })
    .then(data => {
        // ✅ Разблокируем кнопку
        if(button){
            button.textContent = txt;
            button.disabled = false;
        }

        // ✅ 4. Проверка ответа от Checko
        if(data.success){
            fillFormWithCompanyData(data.data);
            showNotification('Данные загружены', 'success');
        } else {
            // Компания не найдена или ошибка API
            const errorMsg = data.error || 'Компания не найдена';
            showNotification(errorMsg, 'error');

            // Подсветка поля ИНН
            if (innInput) {
                innInput.style.borderColor = 'var(--btn-danger, #ef4444)';
            }
            setTimeout(() => {
                if (innInput) {
                    innInput.style.borderColor = '';
                }
            }, 2000);
        }
    })
    .catch(e => {
        // ✅ 5. Ошибка сети
        if(button){
            button.textContent = txt;
            button.disabled = false;
        }

        console.error('Checko API error:', e);
        showNotification('Ошибка сети: ' + e.message, 'error');
    });
}

function fillFormWithCompanyData(companyData){
    console.log('Данные Checko:', companyData, companyData.raw_data);
    let data = companyData;
    if(companyData.raw_data && companyData.raw_data.data){
        data = companyData.raw_data.data;
    }

    const fieldMapping = {
        'modal_company_name': ['НаимСокр','НаимПолн','company_name'],
        'modal_legal_name': ['НаимПолн','НаимСокр','legal_name'],
        'modal_legal_form': ['ОКОПФ.Наим','legal_form'],
        'modal_inn': ['ИНН','inn'],
        'modal_ogrn': ['ОГРН','ogrn'],
        'modal_kpp': ['КПП','kpp'],
        'modal_director_fio': () => getDirectorName(data),
        'modal_address': () => getAddress(data),
        'modal_city': () => getCity(data),
        'modal_phone': () => getPhone(data),
        'modal_email': () => getEmail(data),
        'modal_website': ['Контакты.ВебСайт','website']
    };

    for(const [fieldId, val] of Object.entries(fieldMapping)){
        const el = document.getElementById(fieldId);
        if(!el) continue;
        let value = typeof val === 'function' ? val() : val;
        if(Array.isArray(value)) value = findValueByKeys(data, value);
        if(value !== null && value !== undefined && value !== '') el.value = value;
    }

    const name = document.getElementById('modal_company_name')?.value;
    const legalFormEl = document.getElementById('modal_legal_form');
    if(legalFormEl && name){
        legalFormEl.value = detectLegalForm(name);
    }

    updateLegalNameHeader(data['НаимПолн'] || data['НаимСокр'] || companyData.legal_name || companyData.company_name);
}

// ======== ВСПОМОГАТЕЛЬНЫЕ ДЛЯ CHECKO ========
function detectLegalForm(name){
    if(!name) return 'другая';
    const n = name.toUpperCase();
    if(n.includes('ООО') || n.includes('ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ')) return 'ООО';
    if(n.includes('АО') || n.includes('АКЦИОНЕРНОЕ ОБЩЕСТВО')) return 'АО';
    if(n.includes('ЗАО') || n.includes('ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО')) return 'ЗАО';
    if(n.includes('ИП') || n.includes('ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ')) return 'ИП';
    return 'другая';
}

function findValueByKeys(data, keys){
    for(const key of keys){
        const val = getNestedValue(data, key);
        if(val !== null && val !== undefined && val !== '') return val;
    }
    return null;
}

function getNestedValue(obj, path){
    return path.split('.').reduce((c, k) => c && c[k] !== undefined ? c[k] : null, obj);
}

function getDirectorName(data){
    if(data.Руковод && Array.isArray(data.Руковод) && data.Руковод.length > 0){
        return data.Руковод[0].ФИО || null;
    }
    return null;
}

function getAddress(data){
    if(data.ЮрАдрес){
        return data.ЮрАдрес.АдресРФ || data.ЮрАдрес.НасПункт || null;
    }
    return null;
}

function getCity(data){
    if(data.Регион && data.Регион.Наим) return data.Регион.Наим;
    if(data.ЮрАдрес && data.ЮрАдрес.НасПункт){
        const m = data.ЮрАдрес.НасПункт.match(/г\.\s*([^,]+)/);
        return m ? m[1].trim() : data.ЮрАдрес.НасПункт;
    }
    return null;
}

function getPhone(data){
    if(data.Контакты && Array.isArray(data.Контакты.Тел) && data.Контакты.Тел.length > 0) {
        return data.Контакты.Тел[0];
    }
    return null;
}

function getEmail(data){
    if(data.Контакты && Array.isArray(data.Контакты.Емэйл) && data.Контакты.Емэйл.length > 0) {
        return data.Контакты.Емэйл[0];
    }
    return null;
}