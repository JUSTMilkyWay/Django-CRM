from django.urls import path
from . import views

urlpatterns = [
    path('', views.crm, name='crm_page'),
    path('add_lead/<int:column_id>/', views.add_lead, name='add_lead'),
    path('delete_lead/<int:lead_id>/', views.delete_lead, name='delete_lead'),
    path('move_lead/<int:lead_id>/', views.move_lead, name='move_lead'),
    path('update_lead/<int:lead_id>/', views.update_lead, name='update_lead'),
    path('get_lead/<int:lead_id>/', views.get_lead, name='get_lead'),
]