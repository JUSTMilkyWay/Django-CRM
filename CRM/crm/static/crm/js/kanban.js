// ======== CSRF ========
function renderLeadCard(data) {
    const card = document.createElement('div');
    card.className = `kanban-card priority-${data.priority}`;
    card.dataset.id = data.id;
    card.dataset.priority = data.priority;
    card.draggable = true;
    card.ondragstart = drag;

    card.innerHTML = `
    <div class="card-header">
        <div class="lead-info">
            <div class="lead-name">${data.company_name}</div>
            ${data.inn ? `<small class="lead-inn">ИНН: ${data.inn}</small>` : ''}
        </div>
        <div class="card-actions">
            <button class="card-action-btn edit" title="Редактировать"></button>
            <button class="card-action-btn delete" title="Удалить"></button>
        </div>
    </div>
    ${data.total_amount ? `
    <div class="card-amount">
        <span class="amount-value">${data.total_amount} ₽</span>
    </div>` : ''}
    <div class="card-fields">
        ${data.contact_person ? `<div class="card-field"><span>${data.contact_person}</span></div>` : ''}
        ${data.contact_phone ? `<div class="card-field"><span>${data.contact_phone}</span></div>` : ''}
        ${data.contact_email ? `<div class="card-field"><span>${data.contact_email}</span></div>` : ''}
        ${data.city ? `<div class="card-field"><span>${data.city}</span></div>` : ''}
        ${data.source ? `<div class="card-field"><span>${data.source}</span></div>` : ''}
        ${data.partner_name ? `<div class="card-field"><span>${data.partner_name}</span></div>` : ''}
    </div>
    <div class="card-footer">
        <span class="priority-badge ${data.priority}">${data.priority}</span>
        <span class="card-date">${data.created_at}</span>
    </div>
    `;

    // Кнопки
    card.querySelector('.edit').onclick = e => { e.stopPropagation(); editLead(data.id); };
    card.querySelector('.delete').onclick = e => { e.stopPropagation(); confirmDelete(data.id); };

    return card;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ======== Добавление карточки ========
function renderLeadCard(data) {
    const priority = data.priority || '';
    const priorityClass = priority || 'not-set';

    const card = document.createElement('div');
    card.className = `kanban-card priority-${priorityClass}`;
    card.dataset.id = data.id;
    card.dataset.priority = priority;
    card.draggable = true;
    card.ondragstart = (e) => drag(e);

    // Открытие модалки по клику на карточку (кроме кнопок)
    card.onclick = (e) => {
        if (!e.target.closest('.card-action-btn')) {
            editLead(data.id);
        }
    };

    const amountFormatted = data.total_amount
        ? Number(data.total_amount).toLocaleString('ru-RU', {maximumFractionDigits: 0})
        : null;

    card.innerHTML = `
        <div class="card-header">
            <div class="lead-info">
                <div class="lead-name">${escapeHtml(data.company_name)}</div>
                ${data.inn ? `<small class="lead-inn">ИНН: ${escapeHtml(data.inn)}</small>` : ''}
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
        <div class="card-amount">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span class="amount-value">${amountFormatted} ₽</span>
        </div>` : ''}
        <div class="card-fields">
            ${renderField(data.contact_person, 'user')}
            ${renderField(data.contact_phone, 'phone')}
            ${renderField(data.contact_email, 'mail')}
            ${renderField(data.city, 'map-pin')}
            ${renderField(data.source, 'target')}
            ${renderField(data.partner_name, 'user-plus')}
        </div>
        <div class="card-footer">
            <span class="priority-badge ${priorityClass}">
                ${data.priority_display || 'Не назначен'}
            </span>
            <span class="card-date">${data.created_at}</span>
        </div>
    `;

    // Кнопки
    card.querySelector('.edit').onclick = (e) => { e.stopPropagation(); editLead(data.id); };
    card.querySelector('.delete').onclick = (e) => { e.stopPropagation(); confirmDelete(data.id); };

    return card;
}

// Вспомогательные функции
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderField(value, iconName) {
    if (!value) return '';
    // Или свои SVG-иконки по имени
    return `<div class="card-field"><span>${escapeHtml(value)}</span></div>`;
}

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
        if(data.error){ alert(data.error); return; }

        const container = button.nextElementSibling;
        const card = renderLeadCard(data);
        container.appendChild(card);

        // Обновляем счетчик
        const columnCount = button.parentElement.querySelector('.column-count');
        columnCount.textContent = parseInt(columnCount.textContent) + 1;

        editLead(data.id); // сразу открыть редактирование
    })
    .catch(err => { console.error(err); alert('Ошибка при создании лида'); });
}

// ======== Обновление карточки ========
function updateCardOnBoard(leadId, data) {
    const card = document.querySelector(`.kanban-card[data-id='${leadId}']`);
    if (!card) return;

    // Название компании
    const leadName = card.querySelector('.lead-name');
    if (leadName) leadName.textContent = data.company_name || 'Новый лид';

    // ИНН
    let innEl = card.querySelector('.lead-inn');
    if (data.inn) {
        if (!innEl) {
            innEl = document.createElement('small');
            innEl.className = 'lead-inn';
            card.querySelector('.lead-info').appendChild(innEl);
        }
        innEl.textContent = `ИНН: ${data.inn}`;
    } else if (innEl) innEl.remove();

    // Контактные поля
    const fieldsMap = {
        contact_person: '.contact-person',
        contact_phone: '.contact-phone',
        contact_email: '.contact-email',
        city: '.city',
        source: '.source',
        partner_name: '.partner-name'
    };

    for (const key in fieldsMap) {
        const selector = fieldsMap[key];
        let el = card.querySelector(selector);
        if (data[key]) {
            if (!el) {
                el = document.createElement('div');
                el.className = `card-field ${selector.slice(1)}`;
                el.innerHTML = `<span>${data[key]}</span>`;
                card.querySelector('.card-fields').appendChild(el);
            } else {
                el.querySelector('span').textContent = data[key];
            }
        } else if (el) {
            el.remove();
        }
    }

    // Сумма сделки
    let amountEl = card.querySelector('.card-amount .amount-value');
    if (data.total_amount) {
        if (!amountEl) {
            const amountDiv = document.createElement('div');
            amountDiv.className = 'card-amount';
            amountDiv.innerHTML = `<span class="amount-value">${data.total_amount} ₽</span>`;
            card.appendChild(amountDiv);
        } else {
            amountEl.textContent = `${data.total_amount} ₽`;
        }
    } else if (amountEl) {
        amountEl.closest('.card-amount').remove();
    }

    // Приоритет
    if (data.priority) {
        card.dataset.priority = data.priority;
        card.classList.remove('priority-not_set','priority-low','priority-high','priority-critical');
        card.classList.add(`priority-${data.priority}`);
    }

    // Обновляем кнопки
    const editBtn = card.querySelector('.edit');
    if (editBtn) {
        editBtn.onclick = e => {
            e.stopPropagation();
            editLead(leadId);
        };
    }

    const deleteBtn = card.querySelector('.delete');
    if (deleteBtn) {
        deleteBtn.onclick = e => {
            e.stopPropagation();
            if(confirm('Удалить эту карточку?')) deleteCard(leadId);
        };
    }
}

// ======== Удаление карточки ========
function confirmDelete(leadId) {
    if (confirm('Вы уверены, что хотите удалить этот лид?')) {
        // Логируем для отладки
        console.log('Deleting lead ID:', leadId);

        fetch(`/crm/delete_lead/${leadId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            // Важно: для POST обычно нужен body, даже пустой
            body: JSON.stringify({})
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (response.ok) {
                location.reload();
            } else {
                return response.text().then(text => {
                    throw new Error(`Ошибка ${response.status}: ${text}`);
                });
            }
        })
        .catch(error => {
            console.error('Ошибка удаления:', error);
            alert('Ошибка при удалении: ' + error.message);
        });
    }
}

// ======== Уведомления ========
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px; right: 20px;
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
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
</style>
`);

let currentLeadId = null;

// ======== Edit Lead ========
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
            'website','source','priority','comment',
        ];

        fields.forEach(field => {
            const el = document.getElementById(`modal_${field}`);
            if (!el) return;
            el.value = data[field] || '';
        });

        document.getElementById('leadModal').style.display = 'block';
    });
}

// ======== Drag & Drop ========
let dragged;
function drag(event) { dragged = event.currentTarget; event.dataTransfer.setData("text/plain",""); dragged.classList.add('dragging'); }
function allowDrop(event) { event.preventDefault(); }
function drop(event, columnId) {
    event.preventDefault();
    if (!dragged) return;
    const container = event.currentTarget.querySelector('.kanban-cards');
    container.appendChild(dragged);

    fetch(`move_lead/${dragged.dataset.id}/`, {
        method:'POST',
        headers:{'Content-Type':'application/json','X-CSRFToken':getCookie('csrftoken'),'X-Requested-With':'XMLHttpRequest'},
        body: JSON.stringify({column_id: columnId}),
        credentials:'same-origin'
    }).then(r=>r.json()).then(d=>console.log('Moved:',d)).catch(e=>console.error(e));
}
document.addEventListener('dragend',()=>{if(dragged){dragged.classList.remove('dragging'); dragged=null;}});

// ======== Modal ========
function openLeadModal(leadId){console.log('Открытие модального окна для лида:', leadId);alert('Добавь функцию get_lead в views.py');}
function closeModal(){document.getElementById('leadModal').style.display='none';}
function updateLegalNameHeader(name){const el=document.getElementById('modal_legal_name_base');el.textContent=name||'Новый лид';el.style.display='block';}

// ======== Priority ========
function applyPriorityColors(){
    document.querySelectorAll('.kanban-card').forEach(card=>{
        card.classList.remove('priority-not_set','priority-low','priority-high','priority-critical');
        card.classList.add(`priority-${card.dataset.priority||''}`);
    });
}
document.addEventListener('DOMContentLoaded',applyPriorityColors);

// ======== Save Lead ========
function saveLead() {
    if (!currentLeadId) return;

    const data = {};
    // Поля и их "человеческие имена"
    const fields = {
        company_name: 'Название компании',
        legal_form: 'Форма организации',
        legal_name: 'Юридическое название',
        inn: 'ИНН',
        ogrn: 'ОГРН',
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

    // Собираем данные из модального окна
    for (const key in fields) {
        const el = document.getElementById(`modal_${key}`);
        if (el) data[key] = el.value.trim();
    }

    // Проверяем обязательные поля
    const required = ['company_name', 'legal_form', 'legal_name'];
    const missing = required.filter(f => !data[f]);
    if (missing.length) {
        alert(
            'Заполните обязательные поля:\n• ' +
            missing.map(f => fields[f]).join('\n• ')
        );
        return;
    }

    // Отправка на сервер
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
            alert('Ошибка: ' + result.error);
        } else {
            updateCardOnBoard(currentLeadId, data); // обновление карточки
            updateLegalNameHeader(data.legal_name); // если нужно обновить header
            showNotification('Сохранено!', 'success');
            applyPriorityColors();
        }
    })
    .catch(err => {
        console.error(err);
        alert('Произошла ошибка при сохранении');
    });
}

// ======== Checko API ========
function makeRequestChecko(){
    const inn=document.getElementById('modal_inn').value.trim();
    if(!inn){alert('Введите ИНН');document.getElementById('modal_inn').focus();return;}
    if(!/^\d{10}$/.test(inn)){alert('ИНН должен быть 10 цифр');return;}

    const button=document.querySelector('.api-checko-btn');const txt=button.textContent;
    button.textContent='Загрузка...';button.disabled=true;

    fetch('/companies/api/get_company/',{
        method:'POST',
        headers:{'Content-Type':'application/json','X-CSRFToken':getCookie('csrftoken'),'X-Requested-With':'XMLHttpRequest'},
        body:JSON.stringify({inn})
    }).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();})
    .then(data=>{
        button.textContent=txt;button.disabled=false;
        if(data.success){fillFormWithCompanyData(data.data);showNotification('Данные загружены','success');}
        else showNotification('Ошибка: '+(data.error||'Не удалось получить данные'),'error');
    }).catch(e=>{button.textContent=txt;button.disabled=false;showNotification('Ошибка сети: '+e.message,'error');});
}

function fillFormWithCompanyData(companyData){
    console.log('Данные Checko:',companyData,companyData.raw_data);
    let data=companyData;
    if(companyData.raw_data&&companyData.raw_data.data){data=companyData.raw_data.data;}

    const fieldMapping={
        'modal_company_name':['НаимСокр','НаимПолн','company_name'],
        'modal_legal_name':['НаимПолн','НаимСокр','legal_name'],
        'modal_legal_form':['ОКОПФ.Наим','legal_form'],
        'modal_inn':['ИНН','inn'],
        'modal_ogrn':['ОГРН','ogrn'],
        'modal_kpp':['КПП','kpp'],
        'modal_director_fio':()=>getDirectorName(data),
        'modal_address':()=>getAddress(data),
        'modal_city':()=>getCity(data),
        'modal_phone':()=>getPhone(data),
        'modal_email':()=>getEmail(data),
        'modal_website':['Контакты.ВебСайт','website']
    };

    for(const [fieldId, val] of Object.entries(fieldMapping)){
        const el=document.getElementById(fieldId);
        if(!el) continue;
        let value=typeof val==='function'?val():val;
        if(Array.isArray(value)) value=findValueByKeys(data,value);
        if(value!==null&&value!==undefined&&value!=='') el.value=value;
    }

    // Авто определение юридической формы
    const name=document.getElementById('modal_company_name').value;
    document.getElementById('modal_legal_form').value=detectLegalForm(name);

    updateLegalNameHeader(data['НаимПолн']||data['НаимСокр']||companyData.legal_name||companyData.company_name);
}

// ======== Вспомогательные ========
function detectLegalForm(name){
    if(!name) return 'другая';
    const n=name.toUpperCase();
    if(n.includes('ООО')||n.includes('ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ')) return 'ООО';
    if(n.includes('АО')||n.includes('АКЦИОНЕРНОЕ ОБЩЕСТВО')) return 'АО';
    if(n.includes('ЗАО')||n.includes('ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО')) return 'ЗАО';
    if(n.includes('ИП')||n.includes('ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ')) return 'ИП';
    return 'другая';
}

function findValueByKeys(data, keys){for(const key of keys){const val=getNestedValue(data,key);if(val!==null&&val!==undefined&&val!=='') return val;}return null;}
function getNestedValue(obj,path){return path.split('.').reduce((c,k)=>c&&c[k]!==undefined?c[k]:null,obj);}
function getDirectorName(data){if(data.Руковод&&Array.isArray(data.Руковод)&&data.Руковод.length>0){return data.Руковод[0].ФИО||null;}return null;}
function getAddress(data){if(data.ЮрАдрес){return data.ЮрАдрес.АдресРФ||data.ЮрАдрес.НасПункт||null;}return null;}
function getCity(data){if(data.Регион&&data.Регион.Наим) return data.Регион.Наим;if(data.ЮрАдрес&&data.ЮрАдрес.НасПункт){const m=data.ЮрАдрес.НасПункт.match(/г\.\s*([^,]+)/);return m?m[1].trim():data.ЮрАдрес.НасПункт;}return null;}
function getPhone(data){if(data.Контакты&&Array.isArray(data.Контакты.Тел)&&data.Контакты.Тел.length>0) return data.Контакты.Тел[0];return null;}
function getEmail(data){if(data.Контакты&&Array.isArray(data.Контакты.Емэйл)&&data.Контакты.Емэйл.length>0) return data.Контакты.Емэйл[0];return null;}