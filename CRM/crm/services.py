def create_default_columns(user):
    default_columns = [
        "Входящие",
        "В работе",
        "Обработанные",
        "Подписание",
        "Закрытые успешно",
        "Отказ",
    ]

    for index, title in enumerate(default_columns):
        user.kanban_columns.create(
            title=title,
            order=index
        )