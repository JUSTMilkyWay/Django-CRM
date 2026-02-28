# views.py
from django.shortcuts import render, get_object_or_404
from django.template.loader import render_to_string
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db import models
import json
from .services import create_default_columns
from .models import Lead, KanbanColumn
from .models import KanbanColumn, Lead
from django.db import connection


@login_required
def crm_settings(request):
    columns = KanbanColumn.objects.filter(
        user=request.user
    ).prefetch_related('leads').order_by('order')

    return render(request, 'crm/settings.html', {
        'columns': columns
    })


@login_required
def update_columns(request):
    if request.method != "POST":
        return JsonResponse({"error": "Метод не разрешен"}, status=405)

    try:
        data = json.loads(request.body)
        user = request.user

        # Обновление существующих
        for col in data.get("updated", []):
            KanbanColumn.objects.filter(
                id=col["id"],
                user=user
            ).update(
                title=col.get("title", ""),
                order=col.get("order", 0)
            )

        # Удаление
        for col_id in data.get("deleted", []):
            column = KanbanColumn.objects.filter(
                id=col_id,
                user=user
            ).first()
            if column:
                # Переносим лиды в первую доступную колонку
                target_column = user.kanban_columns.exclude(id=col_id).order_by("order").first()
                if target_column:
                    Lead.objects.filter(column=column, user=user).update(column=target_column)
                column.delete()

        # Создание новых
        max_order = user.kanban_columns.aggregate(models.Max("order"))["order__max"] or 0
        for i, col in enumerate(data.get("new", [])):
            user.kanban_columns.create(
                title=col.get("title", "Новая колонка"),
                order=col.get("order", max_order + i + 1)
            )

        return JsonResponse({"success": True})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
def reset_columns(request):
    if request.method != "POST":
        return JsonResponse({"error": "Метод не разрешен"}, status=405)

    user = request.user
    user.kanban_columns.all().delete()
    create_default_columns(user)

    return JsonResponse({"success": True})


@login_required
def reset_columns(request):
    if request.method != "POST":
        return JsonResponse({"error": "Метод не разрешен"}, status=405)

    user = request.user
    user.kanban_columns.all().delete()
    create_default_columns(user)

    return JsonResponse({"success": True})


@login_required
def crm(request):
    user = request.user

    if not user.kanban_columns.exists():
        create_default_columns(user)

    columns = (
        user.kanban_columns
        .prefetch_related("leads")
        .order_by("order")
    )

    # Считаем сумму лидов для каждой колонки
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_id, COALESCE(SUM(total_amount), 0) as total_sum
            FROM crm_lead
            WHERE user_id = %s
            GROUP BY column_id
        """, [user.id])

        sums_by_column = {row[0]: row[1] for row in cursor.fetchall()}

    # Добавляем сумму и отформатированную строку к каждой колонке
    for column in columns:
        raw_sum = sums_by_column.get(column.id, 0)
        column.total_sum = raw_sum
        # ✅ Форматируем: 1000000 → "1 000 000 ₽"
        column.total_sum_formatted = f"{int(raw_sum):,}".replace(',', ' ') + ' ₽'

    return render(request, 'crm/crm.html', {
        'columns': columns,
    })


@login_required
def add_lead(request, column_id):
    if request.method == 'POST':
        column = get_object_or_404(KanbanColumn, id=column_id, user=request.user)
        lead = Lead.objects.create(user=request.user, column=column, company_name='')
        return JsonResponse({
            'id': lead.id,
            'company_name': lead.company_name,
            'priority': lead.priority,                 # для CSS-класса
            'priority_display': lead.get_priority_display(),  # для текста
            'created_at': lead.created_at.strftime('%d.%m.%Y')
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
    if request.method != "POST":
        return JsonResponse({"error": "Метод не разрешен"}, status=405)

    try:
        data = json.loads(request.body)
        lead = get_object_or_404(Lead, id=lead_id, user=request.user)

        # Обновляем колонку
        new_column_id = data.get("column_id")
        if new_column_id:
            new_column = get_object_or_404(KanbanColumn, id=new_column_id, user=request.user)
            lead.column = new_column
            lead.save()

        # ✅ Перенумеруем ВСЕ лиды в колонке по переданному порядку
        lead_order = data.get("lead_order", [])
        for i, item in enumerate(lead_order):
            Lead.objects.filter(id=item['id'], user=request.user).update(order=i)

        return JsonResponse({"status": "moved"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@login_required
@csrf_exempt
def update_lead(request, lead_id):
    if request.method == "POST":
        try:
            lead = get_object_or_404(Lead, id=lead_id, user=request.user)
            data = json.loads(request.body)

            fields_to_update = [
                'company_name', 'legal_form', 'legal_name',
                'inn', 'ogrn', 'director_fio',
                'contact_person', 'contact_phone', 'contact_email', 'phone', 'email',
                'address', 'city',
                'partner_name', 'partner_position', 'partner_phone',
                'website', 'source', 'priority', 'comment',
                'total_amount', 'credit_purpose', 'client_comment'
            ]

            for field in fields_to_update:
                if field in data:
                    value = data[field] if data[field] != "" else None
                    if field == "total_amount" and value is not None:
                        value = float(value)
                    setattr(lead, field, value)

            lead.save()
            return JsonResponse({"status": "updated"})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Метод не разрешен"}, status=405)


@login_required
def get_lead(request, lead_id):
    try:
        lead = get_object_or_404(Lead, id=lead_id, user=request.user)
        return JsonResponse({
            'id': lead.id,
            'company_name': lead.company_name,
            'legal_form': lead.legal_form or '',
            'legal_name': lead.legal_name or '',
            'inn': lead.inn or '',
            'ogrn': lead.ogrn or '',
            'director_fio': lead.director_fio or '',
            'contact_person': lead.contact_person or '',
            'contact_phone': lead.contact_phone or '',
            'contact_email': lead.contact_email or '',
            'phone': lead.phone or '',
            'email': lead.email or '',
            'address': lead.address or '',
            'city': lead.city or '',
            'partner_name': lead.partner_name or '',
            'partner_position': lead.partner_position or '',
            'partner_phone': lead.partner_phone or '',
            'website': lead.website or '',
            'source': lead.source or '',
            'priority': lead.priority or 'medium',
            'comment': lead.comment or '',
            # новые поля
            'total_amount': float(lead.total_amount or 0),
            'credit_purpose': getattr(lead, 'credit_purpose', ''),
            'client_comment': getattr(lead, 'client_comment', ''),
            'created_at': lead.created_at.strftime("%d.%m.%Y")
        })
    except Lead.DoesNotExist:
        return JsonResponse({"error": "Лид не найден"}, status=404)

