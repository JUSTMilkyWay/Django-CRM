from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.crm, name='crm_page'),
]
