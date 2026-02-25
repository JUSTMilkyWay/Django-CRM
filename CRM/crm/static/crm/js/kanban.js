// Функция для получения CSRF токена
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function addCard(button, columnId) {
    console.log(`Добавление лида в колонку ${columnId}`);

    fetch(`add_lead/${columnId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('Response status:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);

        const container = button.nextElementSibling;
        const card = document.createElement('div');
        card.className = 'kanban-card priority-not_set';
        card.dataset.id = data.id;
        card.dataset.priority = 'not_set';
        card.draggable = true;
        card.ondragstart = drag;

        card.innerHTML = `
            <div class="lead-info">
                <strong>${data.company_name}</strong>
                <div class="lead-meta">${data.created_at}</div>
            </div>
            <div class="card-actions">
                <button class="edit-btn" title="Редактировать">✎</button>
            </div>
        `;

        // Обработчик ТОЛЬКО для кнопки редактирования
        card.querySelector('.edit-btn').onclick = function(event) {
            event.stopPropagation();
            editLead(data.id);
        };

        container.appendChild(card);

        // Обновляем счетчик колонки
        const columnCount = button.parentElement.querySelector('.column-count');
        columnCount.textContent = parseInt(columnCount.textContent) + 1;

        editLead(data.id);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Ошибка при создании лида: ' + error.message);
    });
}

function updateCardOnBoard(leadId, data) {
    const card = document.querySelector(`.kanban-card[data-id='${leadId}']`);
    if (card) {
        // Обновляем название
        card.querySelector('strong').textContent = data.company_name;

        // Добавляем ИНН если есть
        if (data.inn) {
            let innEl = card.querySelector('.inn-info');
            if (!innEl) {
                innEl = document.createElement('small');
                innEl.className = 'inn-info';
                card.querySelector('.lead-info').appendChild(innEl);
            }
            innEl.textContent = `ИНН: ${data.inn}`;
        } else {
            // Удаляем ИНН если его нет
            const innEl = card.querySelector('.inn-info');
            if (innEl) {
                innEl.remove();
            }
        }

        // Обновляем приоритет
        if (data.priority) {
            card.dataset.priority = data.priority;
            card.classList.remove('priority-not_set', 'priority-low', 'priority-high', 'priority-critical');
            card.classList.add(`priority-${data.priority}`);

            // Обновляем индикатор приоритета
            const leadMeta = card.querySelector('.lead-meta');
            let priorityIndicator = card.querySelector('.priority-indicator');

            const priorityTitles = {
                'low': 'Низкий',
                'high': 'Высокий',
                'critical': 'Критический',
                'not_set': 'Не обозначен'
            };

            if (data.priority !== 'not_set') {
                if (!priorityIndicator) {
                    priorityIndicator = document.createElement('span');
                    priorityIndicator.className = 'priority-indicator';
                    leadMeta.appendChild(priorityIndicator);
                }
                priorityIndicator.textContent = priorityTitles[data.priority];
                priorityIndicator.title = `Приоритет: ${priorityTitles[data.priority]}`;
                priorityIndicator.style.display = 'inline';
            } else if (priorityIndicator) {
                // Удаляем индикатор если приоритет "Не обозначен"
                priorityIndicator.remove();
            }
        }
    }
}

function deleteCard(leadId) {
    fetch(`delete_lead/${leadId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (response.ok) {
            const element = document.querySelector(`.kanban-card[data-id='${leadId}']`);
            if (element) {
                // Обновляем счетчик колонки
                const column = element.closest('.kanban-column');
                const columnCount = column.querySelector('.column-count');
                columnCount.textContent = parseInt(columnCount.textContent) - 1;

                // Удаляем элемент с анимацией
                element.style.opacity = '0';
                element.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    element.remove();
                }, 300);
            }
        } else {
            response.json().then(data => {
                console.error('Ошибка удаления:', data.error || 'Неизвестная ошибка');
                showNotification('Ошибка при удалении', 'error');
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Ошибка сети', 'error');
    });
}

// Функция для удаления лида из модального окна
function deleteCurrentLead() {
    if (!currentLeadId) return;

    if (confirm('Вы уверены, что хотите удалить этот лид?')) {
        deleteCard(currentLeadId);
        closeModal();
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff4c4c' : '#8d48e8'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 500);
}

document.head.insertAdjacentHTML('beforeend', `
<style>
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
</style>
`);

// Функция для редактирования лида
function editLead(leadId) {
    currentLeadId = leadId;

    fetch(`get_lead/${leadId}/`)
    .then(response => response.json())
    .then(data => {
        // Заполняем ВСЕ поля
        updateLegalNameHeader(data.legal_name);

        const fields = [
            'company_name', 'legal_form', 'legal_name',
            'inn', 'ogrn', 'director_fio',
            'contact_person', 'contact_phone', 'contact_email', 'phone', 'email',
            'address', 'city',
            'partner_name', 'partner_position', 'partner_phone',
            'website', 'source', 'priority', 'comment'
        ];

        fields.forEach(field => {
            const element = document.getElementById(`modal_${field}`);
            if (element) {
                if (element.type === 'select-one') {
                    element.value = data[field] || '';
                } else {
                    element.value = data[field] || '';
                }
            }
        });

        // Показываем модальное окно
        document.getElementById('leadModal').style.display = 'block';
    });
}

// Drag & drop функции
let dragged;

function drag(event) {
    dragged = event.currentTarget;
    event.dataTransfer.setData("text/plain", "");
    dragged.classList.add('dragging');
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event, columnId) {
    event.preventDefault();

    if (!dragged) return;

    const container = event.currentTarget.querySelector('.kanban-cards');
    container.appendChild(dragged);

    fetch(`move_lead/${dragged.dataset.id}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            column_id: columnId
        }),
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => console.log('Moved:', data))
    .catch(error => console.error('Error:', error));
}

document.addEventListener("dragend", function() {
    if (dragged) {
        dragged.classList.remove('dragging');
        dragged = null;
    }
});

// Модальное окно
function openLeadModal(leadId) {
    console.log('Открытие модального окна для лида:', leadId);
    alert('Модальное окно для лида ' + leadId + '\n\nДобавь в views.py функцию get_lead для загрузки данных');
}

function closeModal() {
    document.getElementById('leadModal').style.display = 'none';
}

// Функция для обновления юр. названия вверху
function updateLegalNameHeader(legalName) {
    const headerElement = document.getElementById('modal_legal_name_base');
    if (legalName) {
        headerElement.textContent = legalName;
        headerElement.style.display = 'block';
    } else {
        headerElement.textContent = 'Новый лид';
        headerElement.style.display = 'block';
    }
}

function applyPriorityColors() {
    const cards = document.querySelectorAll('.kanban-card');

    cards.forEach(card => {
        const priority = card.dataset.priority || 'not_set';

        // Убираем старые классы
        card.classList.remove('priority-not_set', 'priority-low', 'priority-high', 'priority-critical');

        // Добавляем правильный класс
        card.classList.add(`priority-${priority}`);
    });
}

document.addEventListener('DOMContentLoaded', applyPriorityColors);

// Функция сохранения лида
function saveLead() {
    if (!currentLeadId) return;

    // Собираем ВСЕ данные
    const data = {};
    const fields = [
        'company_name', 'legal_form', 'legal_name',
        'inn', 'ogrn', 'director_fio',
        'contact_person', 'contact_phone', 'contact_email', 'phone', 'email',
        'address', 'city',
        'partner_name', 'partner_position', 'partner_phone',
        'website', 'source', 'priority', 'comment'
    ];

    fields.forEach(field => {
        const element = document.getElementById(`modal_${field}`);
        if (element) {
            data[field] = element.value.trim();
        }
    });

    // Проверка ОБЯЗАТЕЛЬНЫХ полей
    const requiredFields = [
        { name: 'company_name', label: 'Название компании' },
        { name: 'legal_form', label: 'Форма организации' },
        { name: 'legal_name', label: 'Юридическое название' }
    ];

    const missingFields = [];

    requiredFields.forEach(field => {
        if (!data[field.name] || !data[field.name].trim()) {
            missingFields.push(field.label);
        }
    });

    if (missingFields.length > 0) {
        alert('Заполните обязательные поля:\n• ' + missingFields.join('\n• '));
        return;
    }

    // Отправляем на сервер
    fetch(`update_lead/${currentLeadId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {
            alert('Ошибка: ' + result.error);
        } else {
            // Обновляем карточку на доске
            updateCardOnBoard(currentLeadId, data);

            // Обновляем заголовок
            updateLegalNameHeader(data.legal_name);

            // Показываем уведомление
            showNotification('Сохранено!', 'success');

            applyPriorityColors();
        }
    });
}

// Для отладки
document.addEventListener('DOMContentLoaded', function() {
    console.log('CRM страница загружена');
});

function makeRequestChecko() {
    // Получаем ИНН из формы
    const inn = document.getElementById('modal_inn').value.trim();

    if (!inn) {
        alert('Введите ИНН для запроса');
        document.getElementById('modal_inn').focus();
        return;
    }

    // Проверка формата ИНН
    if (!/^\d{10}$|^\d{12}$/.test(inn)) {
        alert('ИНН должен содержать 10 или 12 цифр');
        return;
    }

    // Показываем загрузку
    const button = document.querySelector('.api-checko-btn');
    const originalText = button.textContent;
    button.textContent = 'Загрузка...';
    button.disabled = true;

    console.log('Запрос данных для ИНН:', inn);

    // Отправляем запрос к вашему API
    fetch('/companies/api/get_company/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ inn: inn })
    })
    .then(response => {
        console.log('Статус ответа:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Получены данные:', data);

        button.textContent = originalText;
        button.disabled = false;

        if (data.success) {
            // Заполняем поля формы данными из API
            fillFormWithCompanyData(data.data);
            showNotification('Данные компании загружены из Checko', 'success');
        } else {
            showNotification('Ошибка: ' + (data.error || 'Не удалось получить данные'), 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка запроса:', error);
        button.textContent = originalText;
        button.disabled = false;
        showNotification('Ошибка сети: ' + error.message, 'error');
    });
}

function fillFormWithCompanyData(companyData) {
    console.log('Полученные данные компании (верхний уровень):', companyData);
    console.log('Raw data:', companyData.raw_data);

    // Извлекаем данные из raw_data.data если они там
    let data = companyData;
    if (companyData.raw_data && companyData.raw_data.data) {
        console.log('Используем данные из raw_data.data');
        data = companyData.raw_data.data;
    }

    // Маппинг полей с данными из Checko API
    const fieldMapping = {
        // Компания
        'modal_company_name': ['НаимСокр', 'НаимПолн', 'company_name'],
        'modal_legal_name': ['НаимПолн', 'НаимСокр', 'legal_name'],
        'modal_legal_form': ['ОКОПФ.Наим', 'legal_form'],

        // Реквизиты
        'modal_inn': ['ИНН', 'inn'],
        'modal_ogrn': ['ОГРН', 'ogrn'],
        'modal_kpp': ['КПП', 'kpp'],

        // Руководство
        'modal_director_fio': getDirectorName(data),

        // Адрес
        'modal_address': getAddress(data),
        'modal_city': getCity(data),

        // Контакты
        'modal_phone': getPhone(data),
        'modal_email': getEmail(data),
        'modal_website': ['Контакты.ВебСайт', 'website']
    };

    console.log('Маппинг полей:', fieldMapping);

    // Заполняем каждое поле
    for (const [fieldId, fieldValue] of Object.entries(fieldMapping)) {
        const fieldElement = document.getElementById(fieldId);
        if (!fieldElement) {
            console.log(`Поле ${fieldId} не найдено на странице`);
            continue;
        }

        // Если значение - функция, вызываем её
        let value = typeof fieldValue === 'function' ? fieldValue() : fieldValue;

        // Если значение - массив, ищем первый существующий ключ
        if (Array.isArray(value)) {
            value = findValueByKeys(data, value);
        }

        console.log(`Поле ${fieldId}: значение = ${value}`);

        // Заполняем поле, если нашли значение
        if (value !== null && value !== undefined && value !== '') {
            if (fieldElement.type === 'select-one') {
                fieldElement.value = value;
            } else {
                fieldElement.value = value;
            }
        }

        const companyName = document.getElementById('modal_company_name').value;
        document.getElementById('modal_legal_form').value = detectLegalForm(companyName);
    }

    // Обновляем заголовок с юр. названием
    updateLegalNameHeader(data['НаимПолн'] || data['НаимСокр'] || data.legal_name || data.company_name);
}

function detectLegalForm(companyName) {
    if (!companyName) return 'другая';

    const name = companyName.trim().toUpperCase();

    if (name.includes('ООО') || name.includes('ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ')) {
        return 'ООО';
    }
    if (name.includes('АО') || name.includes('АКЦИОНЕРНОЕ ОБЩЕСТВО')) {
        return 'АО';
    }
    if (name.includes('ЗАО') || name.includes('ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО')) {
        return 'ЗАО';
    }
    if (name.includes('ИП') || name.includes('ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ')) {
        return 'ИП';
    }

    return 'другая';
}

// Вспомогательные функции для извлечения данных
function findValueByKeys(data, keys) {
    for (const key of keys) {
        const value = getNestedValue(data, key);
        if (value !== null && value !== undefined && value !== '') {
            return value;
        }
    }
    return null;
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

function getDirectorName(data) {
    // Проверяем массив Руковод
    if (data.Руковод && Array.isArray(data.Руковод) && data.Руковод.length > 0) {
        const director = data.Руковод[0];
        if (director.ФИО) {
            return director.ФИО;
        }
    }
    return null;
}

function getAddress(data) {
    // Проверяем ЮрАдрес
    if (data.ЮрАдрес && data.ЮрАдрес.АдресРФ) {
        return data.ЮрАдрес.АдресРФ;
    }
    if (data.ЮрАдрес && data.ЮрАдрес.НасПункт) {
        return data.ЮрАдрес.НасПункт;
    }
    return null;
}

function getCity(data) {
    // Проверяем Регион
    if (data.Регион && data.Регион.Наим) {
        return data.Регион.Наим;
    }
    if (data.ЮрАдрес && data.ЮрАдрес.НасПункт) {
        // Извлекаем город из адреса
        const address = data.ЮрАдрес.НасПункт;
        const cityMatch = address.match(/г\.\s*([^,]+)/);
        if (cityMatch) {
            return cityMatch[1].trim();
        }
        return address;
    }
    return null;
}

function getPhone(data) {
    // Проверяем Контакты.Тел
    if (data.Контакты && data.Контакты.Тел && Array.isArray(data.Контакты.Тел) && data.Контакты.Тел.length > 0) {
        return data.Контакты.Тел[0];
    }
    return null;
}

function getEmail(data) {
    // Проверяем Контакты.Емэйл
    if (data.Контакты && data.Контакты.Емэйл && Array.isArray(data.Контакты.Емэйл) && data.Контакты.Емэйл.length > 0) {
        return data.Контакты.Емэйл[0];
    }
    return null;
}


