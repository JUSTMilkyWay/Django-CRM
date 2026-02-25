from django.urls import path
from . import views

urlpatterns = [
    path('', views.tools_main, name='tools_main'),
    path('txt51-to-excel/', views.txt51_to_excel, name='txt51_to_excel'),
]