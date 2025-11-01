from django.shortcuts import render

def crm(request):
    columns = [
        "Входящие",
        "В работе",
        "Обработан",
        "Подписание документов",
        "Закрытая сделка"
    ]
    return render(request, 'crm/crm.html', {'columns': columns})
