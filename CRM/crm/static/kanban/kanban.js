let dragged;

function addCard(columnId) {
    fetch(`/kanban/add_lead/${columnId}/`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            let col = document.getElementById(`column-${columnId}`);
            let div = document.createElement('div');
            div.className = 'kanban-card';
            div.dataset.id = data.id;
            div.draggable = true;
            div.innerHTML = `<span>${data.company_name || 'Новый клиент'}</span>
                             <button class="delete-btn" onclick="deleteCard(${data.id})">&times;</button>`;
            col.querySelector('.kanban-cards').appendChild(div);
        });
}

function deleteCard(leadId) {
    fetch(`/kanban/delete_lead/${leadId}/`, { method: 'POST' })
        .then(() => {
            let el = document.querySelector(`.kanban-card[data-id='${leadId}']`);
            el.remove();
        });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height/2;
        if(offset < 0 && offset > closest.offset) return {offset: offset, element: child};
        return closest;
    }, {offset: Number.NEGATIVE_INFINITY}).element;
}

document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("dragstart", e => {
        if(e.target.classList.contains('kanban-card')) {
            dragged = e.target;
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener("dragend", e => e.target.classList.remove('dragging'));

    document.querySelectorAll('.kanban-cards').forEach(col => {
        col.addEventListener("dragover", e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(col, e.clientY);
            if(!afterElement) col.appendChild(dragged);
            else col.insertBefore(dragged, afterElement);
        });
    });
});
