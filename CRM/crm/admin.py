from django.contrib import admin
from .models import KanbanColumn, Lead, Profile

admin.site.register(KanbanColumn)
admin.site.register(Lead)
admin.site.register(Profile)
