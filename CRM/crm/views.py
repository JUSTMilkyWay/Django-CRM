from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from .models import KanbanColumn, Lead
from .forms import LeadForm
from django.views.decorators.csrf import csrf_exempt
import json


@login_required
def crm(request):
    # Берем только колонки текущего пользователя
    columns = KanbanColumn.objects.filter(user=request.user).prefetch_related('leads').all()

    # Если у пользователя нет колонок, создаем стандартные
    if not columns.exists():
        default_columns = [
            {"title": "Входящие", "color": "#4CAF50", "order": 0},
            {"title": "В работе", "color": "#2196F3", "order": 1},
            {"title": "Обработан", "color": "#FF9800", "order": 2},
            {"title": "Подписание", "color": "#9C27B0", "order": 3},
            {"title": "Закрыта", "color": "#607D8B", "order": 4},
        ]

        for col_data in default_columns:
            KanbanColumn.objects.create(
                user=request.user,
                title=col_data["title"],
                color=col_data["color"],
                order=col_data["order"]
            )

        columns = KanbanColumn.objects.filter(user=request.user).prefetch_related('leads').all()

    return render(request, 'crm/crm.html', {'columns': columns})


@login_required
@csrf_exempt
def add_lead(request, column_id):
    if request.method == "POST":
        column = get_object_or_404(KanbanColumn, id=column_id, user=request.user)

        # Создаем lead с пользователем
        lead = Lead.objects.create(
            user=request.user,
            column=column,
            company_name="Новый клиент",
            order=column.leads.count()  # Ставим в конец
        )

        return JsonResponse({
            "id": lead.id,
            "company_name": lead.company_name,
            "created_at": lead.created_at.strftime("%d.%m.%Y")
        })


@login_required
@csrf_exempt
def delete_lead(request, lead_id):
    if request.method == "POST":
        lead = get_object_or_404(Lead, id=lead_id, user=request.user)
        lead.delete()
        return JsonResponse({"status": "deleted"})


@login_required
@csrf_exempt
def move_lead(request, lead_id):
    if request.method == "POST":
        data = json.loads(request.body)
        lead = get_object_or_404(Lead, id=lead_id, user=request.user)

        # Проверяем, что новая колонка принадлежит пользователю
        new_column_id = data.get("column_id")
        if new_column_id:
            new_column = get_object_or_404(KanbanColumn, id=new_column_id, user=request.user)
            lead.column = new_column

        lead.order = data.get("order", lead.order)
        lead.save()

        return JsonResponse({"status": "moved"})


@login_required
@csrf_exempt
def update_lead(request, lead_id):
    if request.method == "POST":
        lead = get_object_or_404(Lead, id=lead_id, user=request.user)
        data = json.loads(request.body)

        # Обновляем поля
        if 'company_name' in data:
            lead.company_name = data['company_name']
        if 'inn' in data:
            lead.inn = data['inn']
        if 'ogrn' in data:
            lead.ogrn = data['ogrn']
        if 'director_fio' in data:
            lead.director_fio = data['director_fio']
        if 'phone' in data:
            lead.phone = data['phone']
        if 'email' in data:
            lead.email = data['email']
        if 'comment' in data:
            lead.comment = data['comment']

        lead.save()
        return JsonResponse({"status": "updated"})

@login_required
def get_lead(request, lead_id):
    try:
        lead = Lead.objects.get(id=lead_id)
        return JsonResponse({
            # Основные поля
            'id': lead.id,
            'company_name': lead.company_name,
            'legal_form': lead.legal_form or '',
            'legal_name': lead.legal_name or '',

            # Реквизиты
            'inn': lead.inn or '',
            'ogrn': lead.ogrn or '',
            'director_fio': lead.director_fio or '',

            # Контакты
            'contact_person': lead.contact_person or '',
            'contact_phone': lead.contact_phone or '',
            'contact_email': lead.contact_email or '',
            'phone': lead.phone or '',
            'email': lead.email or '',

            # Адрес
            'address': lead.address or '',
            'city': lead.city or '',

            # Партнёр
            'partner_name': lead.partner_name or '',
            'partner_position': lead.partner_position or '',
            'partner_phone': lead.partner_phone or '',

            # Дополнительно
            'website': lead.website or '',
            'source': lead.source or '',
            'priority': lead.priority or '',
            'comment': lead.comment or '',

            'created_at': lead.created_at.strftime("%d.%m.%Y")
        })
    except Lead.DoesNotExist:
        return JsonResponse({"error": "Лид не найден"}, status=404)


@csrf_exempt
def update_lead(request, lead_id):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            lead = Lead.objects.get(id=lead_id)

            # Обновляем ВСЕ поля
            fields_to_update = [
                'company_name', 'legal_form', 'legal_name',
                'inn', 'ogrn', 'director_fio',
                'contact_person', 'contact_phone', 'contact_email', 'phone', 'email',
                'address', 'city',
                'partner_name', 'partner_position', 'partner_phone',
                'website', 'source', 'priority', 'comment'
            ]

            for field in fields_to_update:
                if field in data:
                    setattr(lead, field, data[field] or None)

            lead.save()
            return JsonResponse({"status": "success"})

        except Lead.DoesNotExist:
            return JsonResponse({"error": "Лид не найден"}, status=404)
    return JsonResponse({"error": "Метод не разрешен"}, status=405)