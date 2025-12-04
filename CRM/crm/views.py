from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import KanbanColumn, Lead
from django.views.decorators.csrf import csrf_exempt
import json

def crm(request):
    columns = KanbanColumn.objects.prefetch_related('leads').all()
    return render(request, 'crm/crm.html', {'columns': columns})


@csrf_exempt
def add_lead(request, column_id):
    if request.method == "POST":
        column = get_object_or_404(KanbanColumn, id=column_id)
        lead = Lead.objects.create(column=column, company_name="Новый клиент")
        return JsonResponse({"id": lead.id, "company_name": lead.company_name})

@csrf_exempt
def delete_lead(request, lead_id):
    if request.method == "POST":
        lead = get_object_or_404(Lead, id=lead_id)
        lead.delete()
        return JsonResponse({"status": "deleted"})

@csrf_exempt
def move_lead(request, lead_id):
    if request.method == "POST":
        data = json.loads(request.body)
        lead = get_object_or_404(Lead, id=lead_id)
        lead.column_id = data.get("column_id", lead.column_id)
        lead.order = data.get("order", lead.order)
        lead.save()
        return JsonResponse({"status": "moved"})
