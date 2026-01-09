from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.db import models
import json

from .models import KanbanColumn, Lead


@login_required
def crm_settings(request):
    """Страница настроек CRM"""
    columns = KanbanColumn.objects.filter(user=request.user).prefetch_related('leads').all()

    color_palette = [
        '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B',
        '#E91E63', '#00BCD4', '#FFC107', '#795548', '#03A9F4',
        '#8BC34A', '#FF5722', '#009688', '#3F51B5', '#FFEB3B'
    ]

    return render(request, 'crm/settings.html', {
        'columns': columns,
        'color_palette': color_palette
    })


@login_required
@csrf_exempt
def update_columns(request):
    """Обновление колонок"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            user = request.user

            # 1. Обновляем существующие колонки
            for column_data in data.get('updated', []):
                try:
                    column = KanbanColumn.objects.get(id=column_data['id'], user=user)
                    if 'title' in column_data:
                        column.title = column_data['title']
                    if 'color' in column_data:
                        column.color = column_data['color']
                    column.save()
                except KanbanColumn.DoesNotExist:
                    continue

            # 2. Удаляем колонки
            for column_id in data.get('deleted', []):
                try:
                    column = KanbanColumn.objects.get(id=column_id, user=user)
                    first_column = KanbanColumn.objects.filter(user=user).first()
                    if first_column and first_column.id != column_id:
                        Lead.objects.filter(column=column, user=user).update(column=first_column)
                    column.delete()
                except KanbanColumn.DoesNotExist:
                    continue

            # 3. Создаем новые колонки
            for column_data in data.get('new', []):
                max_order = KanbanColumn.objects.filter(user=user).aggregate(
                    models.Max('order')
                )['order__max'] or 0
                KanbanColumn.objects.create(
                    user=user,
                    title=column_data.get('title', 'Новая колонка'),
                    color=column_data.get('color', '#4CAF50'),
                    order=max_order + 1
                )

            return JsonResponse({"success": True})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"success": False, "error": "Метод не разрешен"}, status=405)


@login_required
@csrf_exempt
def reset_columns(request):
    """Сброс колонок к стандартным"""
    if request.method == "POST":
        try:
            user = request.user
            KanbanColumn.objects.filter(user=user).delete()

            default_columns = [
                {"title": "Входящие", "color": "#4CAF50", "order": 0},
                {"title": "В работе", "color": "#2196F3", "order": 1},
                {"title": "Обработан", "color": "#FF9800", "order": 2},
                {"title": "Подписание", "color": "#9C27B0", "order": 3},
                {"title": "Закрыта", "color": "#607D8B", "order": 4},
            ]

            for col_data in default_columns:
                KanbanColumn.objects.create(
                    user=user,
                    title=col_data["title"],
                    color=col_data["color"],
                    order=col_data["order"]
                )

            return JsonResponse({"success": True})

        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"success": False, "error": "Метод не разрешен"}, status=405)


@login_required
def crm(request):
    columns = KanbanColumn.objects.filter(user=request.user).prefetch_related('leads').all()

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
        lead = Lead.objects.create(
            user=request.user,
            column=column,
            company_name="Новый клиент",
            order=column.leads.count()
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
    """Обновление всех полей лида (только для владельца)"""
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
                'website', 'source', 'priority', 'comment'
            ]

            for field in fields_to_update:
                if field in data:
                    value = data[field] if data[field] != "" else None
                    setattr(lead, field, value)

            lead.save()
            return JsonResponse({"status": "updated"})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Метод не разрешен"}, status=405)


@login_required
def get_lead(request, lead_id):
    """Получение данных лида (только для владельца)"""
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
            'priority': lead.priority or '',
            'comment': lead.comment or '',
            'created_at': lead.created_at.strftime("%d.%m.%Y")
        })
    except Lead.DoesNotExist:
        return JsonResponse({"error": "Лид не найден"}, status=404)