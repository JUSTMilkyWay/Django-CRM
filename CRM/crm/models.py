from django.db import models
from django.contrib.auth.models import User


class KanbanColumn(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kanban_columns', null=True, blank=True)
    title = models.CharField(max_length=50)
    color = models.CharField(max_length=20, default="#2b2b2b")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title


class Lead(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leads', null=True, blank=True)
    company_name = models.CharField(max_length=100, blank=True, null=True)
    inn = models.CharField(max_length=12, blank=True, null=True)
    ogrn = models.CharField(max_length=13, blank=True, null=True)
    director_fio = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    comment = models.TextField(blank=True, null=True)

    legal_form = models.CharField(max_length=20, blank=True, null=True, verbose_name='Форма организации')
    legal_name = models.CharField(max_length=300, blank=True, null=True, verbose_name='Юридическое название')

    # Контактная информация (раздел)
    contact_person = models.CharField(max_length=200, blank=True, null=True, verbose_name='Контактное лицо')
    contact_phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Контактный телефон')
    contact_email = models.EmailField(blank=True, null=True, verbose_name='Контактный email')

    # Адрес (раздел)
    address = models.TextField(blank=True, null=True, verbose_name='Адрес')
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name='Город')

    # Партнёр (раздел)
    partner_name = models.CharField(max_length=200, blank=True, null=True, verbose_name='Партнёр (ФИО)')
    partner_position = models.CharField(max_length=200, blank=True, null=True, verbose_name='Должность партнёра')
    partner_phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Телефон партнёра')

    # Дополнительно (раздел)
    website = models.URLField(blank=True, null=True, verbose_name='Сайт')
    source = models.CharField(max_length=100, blank=True, null=True, verbose_name='Источник')
    priority = models.CharField(max_length=20, blank=True, null=True, verbose_name='Приоритет')

    column = models.ForeignKey(
        KanbanColumn,
        on_delete=models.CASCADE,
        related_name='leads'
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.company_name or "Новый клиент"