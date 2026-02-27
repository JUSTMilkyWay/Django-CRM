// ======== CSRF ========
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
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('Создан лид:', data);

        const container = button.nextElementSibling;
        const card = document.createElement('div');

        const priority = data.priority || 'not_set';
        card.className = `kanban-card priority-${priority}`;
        card.dataset.priority = priority;

        card.dataset.id = data.id;
        card.draggable = true;
        card.ondragstart = drag;

        card.innerHTML = `
            <div class="lead-info">
                <strong>${data.company_name}</strong>
                <div class="lead-meta">${data.created_at}</div>
            </div>
            <div class="card-actions">
                <button class="edit-btn" title="Редактировать"></button>
            </div>
        `;

        card.querySelector('.edit-btn').onclick = e => {
            e.stopPropagation();
            editLead(data.id);
        };

        container.appendChild(card);

        // Обновляем счетчик
        const columnCount = button.parentElement.querySelector('.column-count');
        columnCount.textContent = parseInt(columnCount.textContent) + 1;

        editLead(data.id);
    })
    .catch(error => {
        console.error('Ошибка при создании лида:', error);
        alert('Ошибка при создании лида: ' + error.message);
    });
}

// ======== Обновление карточки ========
function updateCardOnBoard(leadId, data) {
    const card = document.querySelector(`.kanban-card[data-id='${leadId}']`);
    if (!card) return;

    const leadInfo = card.querySelector('.lead-info');
    if (leadInfo) {
        leadInfo.querySelector('strong').textContent = data.company_name || 'Новая компания';
    }

    // ИНН
    let innEl = card.querySelector('.inn-info');
    if (data.inn) {
        if (!innEl) {
            innEl = document.createElement('small');
            innEl.className = 'inn-info';
            card.querySelector('.lead-info').appendChild(innEl);
        }
        innEl.textContent = `ИНН: ${data.inn}`;
    } else if (innEl) innEl.remove();

    // Приоритет
    if (data.priority) {
        card.dataset.priority = data.priority;
        card.classList.remove('priority-not_set', 'priority-low', 'priority-high', 'priority-critical');
        card.classList.add(`priority-${data.priority}`);
        applyPriorityColors();
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
function saveLead(){
    if(!currentLeadId) return;
    const data={};
    const fields=['company_name','legal_form','legal_name','inn','ogrn','director_fio','contact_person','contact_phone','contact_email','phone','email','address','city','partner_name','partner_position','partner_phone','website','source','priority','comment'];
    fields.forEach(f=>{const el=document.getElementById(`modal_${f}`);if(el)data[f]=el.value.trim();});

    const missing=fields.filter(f=>['company_name','legal_form','legal_name'].includes(f)&&!data[f]);
    if(missing.length){alert('Заполните обязательные поля:\n• '+missing.join('\n• '));return;}

    fetch(`update_lead/${currentLeadId}/`,{
        method:'POST',
        headers:{'Content-Type':'application/json','X-CSRFToken':getCookie('csrftoken')},
        body:JSON.stringify(data)
    }).then(r=>r.json()).then(result=>{
        if(result.error) alert('Ошибка: '+result.error);
        else{updateCardOnBoard(currentLeadId,data);updateLegalNameHeader(data.legal_name);showNotification('Сохранено!','success');applyPriorityColors();}
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