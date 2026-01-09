from django.db import models
from django.contrib.auth.models import User
from crm.models import Lead  # Импорт модели лида
import json


class CompanyData(models.Model):
    """Модель для хранения данных компаний из API"""
    inn = models.CharField(max_length=12, unique=True, db_index=True, verbose_name='ИНН')

    # Основные данные
    company_name = models.CharField(max_length=500, blank=True, null=True, verbose_name='Название компании')
    legal_name = models.CharField(max_length=500, blank=True, null=True, verbose_name='Юридическое название')
    legal_form = models.CharField(max_length=50, blank=True, null=True, verbose_name='Форма организации')

    # Реквизиты
    ogrn = models.CharField(max_length=15, blank=True, null=True, verbose_name='ОГРН')
    kpp = models.CharField(max_length=9, blank=True, null=True, verbose_name='КПП')
    okpo = models.CharField(max_length=10, blank=True, null=True, verbose_name='ОКПО')
    okved = models.CharField(max_length=100, blank=True, null=True, verbose_name='ОКВЭД')

    # Адрес
    address = models.TextField(blank=True, null=True, verbose_name='Адрес')
    address_full = models.TextField(blank=True, null=True, verbose_name='Полный адрес')
    city = models.CharField(max_length=100, blank=True, null=True, verbose_name='Город')
    region = models.CharField(max_length=100, blank=True, null=True, verbose_name='Регион')
    postal_code = models.CharField(max_length=20, blank=True, null=True, verbose_name='Почтовый индекс')

    # Руководство
    director_fio = models.CharField(max_length=200, blank=True, null=True, verbose_name='Генеральный директор')
    director_position = models.CharField(max_length=100, blank=True, null=True, verbose_name='Должность руководителя')

    # Контакты
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Телефон')
    email = models.EmailField(blank=True, null=True, verbose_name='Email')
    website = models.URLField(blank=True, null=True, verbose_name='Сайт')

    # Финансы
    authorized_capital = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True,
                                             verbose_name='Уставный капитал')
    revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True,
                                  verbose_name='Выручка')
    profit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True,
                                 verbose_name='Прибыль')

    # Статус
    status = models.CharField(max_length=50, blank=True, null=True, verbose_name='Статус')
    registration_date = models.DateField(null=True, blank=True, verbose_name='Дата регистрации')
    liquidation_date = models.DateField(null=True, blank=True, verbose_name='Дата ликвидации')

    # API данные
    raw_data = models.JSONField(blank=True, null=True, verbose_name='Сырые данные API')
    source = models.CharField(max_length=50, default='checko', verbose_name='Источник данных')

    # Метаданные
    last_updated = models.DateTimeField(auto_now=True, verbose_name='Последнее обновление')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     verbose_name='Запросил')
    is_actual = models.BooleanField(default=True, verbose_name='Актуальные данные')

    # Связи
    leads = models.ManyToManyField(Lead, through='CompanyLeadRelation', related_name='company_data',
                                   verbose_name='Связанные лиды')

    class Meta:
        verbose_name = 'Данные компании'
        verbose_name_plural = 'Данные компаний'
        indexes = [
            models.Index(fields=['inn']),
            models.Index(fields=['company_name']),
            models.Index(fields=['legal_name']),
        ]

    def __str__(self):
        return f"{self.company_name or self.legal_name or 'Неизвестно'} ({self.inn})"

    def get_short_info(self):
        """Краткая информация о компании"""
        info = []
        if self.legal_form:
            info.append(self.legal_form)
        if self.city:
            info.append(f"г. {self.city}")
        if self.director_fio:
            info.append(f"Директор: {self.director_fio}")
        return ", ".join(info) if info else "Нет данных"


class CompanyLeadRelation(models.Model):
    """Промежуточная модель для связи компании и лидов"""
    company = models.ForeignKey(CompanyData, on_delete=models.CASCADE, verbose_name='Компания')
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, verbose_name='Лид')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата связи')

    class Meta:
        unique_together = ['company', 'lead']
        verbose_name = 'Связь компании с лидом'
        verbose_name_plural = 'Связи компаний с лидами'

    def __str__(self):
        return f"{self.company} - {self.lead}"


class APIRequestLog(models.Model):
    """Лог запросов к API"""
    inn = models.CharField(max_length=12, verbose_name='ИНН')
    source = models.CharField(max_length=50, verbose_name='Источник API')
    status = models.CharField(max_length=20, verbose_name='Статус запроса')
    response_data = models.JSONField(blank=True, null=True, verbose_name='Ответ API')
    error_message = models.TextField(blank=True, null=True, verbose_name='Сообщение об ошибке')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     verbose_name='Пользователь')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата запроса')

    class Meta:
        verbose_name = 'Лог запроса API'
        verbose_name_plural = 'Логи запросов API'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.inn} - {self.status} - {self.created_at.strftime('%d.%m.%Y %H:%M')}"


class CompanyDocument(models.Model):
    """Документы, прикрепленные к компании"""
    company = models.ForeignKey(CompanyData, on_delete=models.CASCADE, related_name='documents',
                                verbose_name='Компания')
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, null=True, blank=True,
                             related_name='company_documents', verbose_name='Лид')
    document_type = models.CharField(max_length=50, verbose_name='Тип документа',
                                     choices=[
                                         ('excel', 'Excel файл'),
                                         ('pdf', 'PDF файл'),
                                         ('scan', 'Скан документа'),
                                         ('other', 'Другой документ'),
                                     ])
    title = models.CharField(max_length=255, verbose_name='Название документа')
    file = models.FileField(upload_to='company_documents/%Y/%m/%d/', verbose_name='Файл')
    description = models.TextField(blank=True, null=True, verbose_name='Описание')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    verbose_name='Загрузил')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')

    class Meta:
        verbose_name = 'Документ компании'
        verbose_name_plural = 'Документы компаний'

    def __str__(self):
        return f"{self.title} ({self.company})"

    def get_file_extension(self):
        return self.file.name.split('.')[-1].lower()

    def get_file_size(self):
        try:
            size = self.file.size
            if size < 1024:
                return f"{size} Б"
            elif size < 1024 * 1024:
                return f"{size / 1024:.1f} КБ"
            else:
                return f"{size / (1024 * 1024):.1f} МБ"
        except:
            return "Неизвестно"