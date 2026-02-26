let changes = {
    updated: [],
    deleted: [],
    new: []
};

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
        </div>
    `;

    list.insertAdjacentHTML("beforeend", html);
}

function deleteColumn(id) {
    if (!confirm("Удалить колонку?")) return;

    const item = document.querySelector(`[data-column-id="${id}"]`);
    if (id.toString().startsWith("new_")) {
        item.remove();
    } else {
        changes.deleted.push(parseInt(id));
        item.remove();
    }
}

function saveAllChanges() {
    const columns = document.querySelectorAll(".column-item");

    const data = {
        deleted: changes.deleted,
        updated: [],
        new: []
    };

    columns.forEach(col => {
        const id = col.dataset.columnId;
        const title = col.querySelector(".column-title").value.trim();
        const isFinal = col.querySelector(".final-stage").checked;
        const exclude = col.querySelector(".exclude-stage").checked;

        if (id.startsWith("new_")) {
            data.new.push({ title, is_final: isFinal, exclude });
        } else {
            data.updated.push({
                id: parseInt(id),
                title,
                is_final: isFinal,
                exclude
            });
        }
    });

    fetch("/crm/update_columns/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")
        },
        body: JSON.stringify(data)
    }).then(() => location.reload());
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie) {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
    }
    return cookieValue;
}