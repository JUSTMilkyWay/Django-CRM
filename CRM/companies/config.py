import os
from django.conf import settings

# Настройки API Checko
CHECKO_API_CONFIG = {
    'api_key': os.environ.get('CHECKO_API_KEY', 'ваш_api_ключ'),  # Используйте переменные окружения!
    'base_url': 'https://api.checko.ru/v2/company',
    'timeout': 30,
    'cache_duration_days': 30,  # Сколько дней хранить кэш
}

# Другие API (можно добавить позже)
OTHER_APIS = {
    'dadata': {
        'api_key': os.environ.get('DADATA_API_KEY', ''),
        'secret_key': os.environ.get('DADATA_SECRET_KEY', ''),
        'base_url': 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
    },
    'sbis': {
        'api_key': os.environ.get('SBIS_API_KEY', ''),
        'base_url': 'https://api.sbis.ru/contragent',
    }
}

# Настройки Excel экспорта
EXPORT_CONFIG = {
    'template_path': os.path.join(settings.BASE_DIR, 'companies', 'templates', 'company_template.xlsx'),
    'output_dir': os.path.join(settings.MEDIA_ROOT, 'company_exports'),
    'default_filename': 'company_data_{inn}_{date}.xlsx',
}