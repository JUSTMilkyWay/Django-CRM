from django.urls import path
from django.views.generic import RedirectView
from . import views

urlpatterns = [
    path('', RedirectView.as_view(url='test/', permanent=False)),  # Redirect /companies/ to /companies/test/
    path('test/', views.test_api_view, name='companies_test'),
    path('api/get_company/', views.get_company_by_inn, name='get_company_by_inn'),
    path('api/export_excel/<str:inn>/', views.export_company_excel, name='export_company_excel'),
]