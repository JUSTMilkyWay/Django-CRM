from django.forms import ModelForm, TextInput
from .models import Lead

class LeadForm(ModelForm):
    class Meta:
        model = Lead
        fields = ['company_name']
        widgets = {
            "company_name": TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Название компании'
            }),
        }
