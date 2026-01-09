import requests
import json
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Локальные настройки
CHECKO_API_CONFIG = {
    'api_key': 'n1eLMRORBrNgUbye',  # Ваш API ключ
    'base_url': 'https://api.checko.ru/v2/company',
    'timeout': 30,
    'cache_duration_days': 30,
}


class CheckoAPIService:
    """Сервис для работы с API Checko"""

    def __init__(self, user=None):
        self.api_key = CHECKO_API_CONFIG['api_key']
        self.base_url = CHECKO_API_CONFIG['base_url']
        self.timeout = CHECKO_API_CONFIG['timeout']
        self.user = user

    def get_company_by_inn(self, inn, force_refresh=False):
        """
        Получение данных компании по ИНН
        """
        try:
            # Формируем URL
            url = f"{self.base_url}?key={self.api_key}&inn={inn}"

            # Отправляем запрос
            response = requests.get(url, timeout=self.timeout)
            response.raise_for_status()

            # Парсим ответ
            data = response.json()

            # Извлекаем данные
            company_info = self._extract_company_info(data)

            # Возвращаем данные
            return {
                'inn': inn,
                'company_name': company_info.get('name', f'Компания {inn}'),
                'legal_name': company_info.get('full_name', f'ООО "Компания {inn}"'),
                'legal_form': company_info.get('legal_form', 'ООО'),
                'ogrn': company_info.get('ogrn', ''),
                'kpp': company_info.get('kpp', ''),
                'address': company_info.get('address', ''),
                'city': company_info.get('city', ''),
                'director_fio': company_info.get('director', ''),
                'phone': company_info.get('phone', ''),
                'email': company_info.get('email', ''),
                'website': company_info.get('website', ''),
                'status': company_info.get('status', ''),
                'registration_date': company_info.get('registration_date', ''),
                'is_from_cache': False,
                'raw_data': data,  # Полные данные API
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка запроса к API Checko для ИНН {inn}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Ошибка парсинга JSON для ИНН {inn}: {e}")
            return None
        except Exception as e:
            logger.error(f"Неожиданная ошибка для ИНН {inn}: {e}")
            return None

    def _extract_company_info(self, api_data):
        """Извлечение нужной информации из ответа API Checko с русскими ключами"""
        info = {}

        try:
            if 'data' in api_data and isinstance(api_data['data'], dict):
                data = api_data['data']

                # Основные поля (русские ключи в API)
                info['name'] = data.get('НаимСокр')  # Краткое название
                info['full_name'] = data.get('НаимПолн')  # Полное название
                info['legal_form'] = self._extract_legal_form(data.get('НаимПолн', ''))  # Извлекаем из названия
                info['ogrn'] = data.get('ОГРН')
                info['kpp'] = data.get('КПП')
                info['okpo'] = data.get('ОКПО')
                info['okved'] = data.get('ОКВЭД')

                # Даты
                info['registration_date'] = data.get('ДатаРег')

                # Статус
                if 'Статус' in data and isinstance(data['Статус'], dict):
                    info['status'] = data['Статус'].get('Наим', '')

                # Регион
                if 'Регион' in data and isinstance(data['Регион'], dict):
                    info['region'] = data['Регион'].get('Наим', '')

                # Юридический адрес
                if 'ЮрАдрес' in data and isinstance(data['ЮрАдрес'], dict):
                    address_data = data['ЮрАдрес']
                    address_parts = []

                    if address_data.get('АдресРФ'):
                        address_parts.append(address_data['АдресРФ'])
                    if address_data.get('НасПункт'):
                        address_parts.append(address_data['НасПункт'])

                    info['address'] = ', '.join(filter(None, address_parts))

                    # Пытаемся извлечь город
                    city = address_data.get('НасПункт', '')
                    if city and 'г.' in city:
                        info['city'] = city.replace('г.', '').strip()
                    elif city:
                        info['city'] = city

                # Почтовый индекс из адреса
                if 'address' in info and info['address']:
                    import re
                    zip_match = re.search(r'\b\d{6}\b', info['address'])
                    if zip_match:
                        info['postal_code'] = zip_match.group()

                # Руководство (если есть в данных)
                if 'Руководитель' in data and isinstance(data['Руководитель'], dict):
                    director_data = data['Руководитель']
                    director_parts = []

                    if director_data.get('Фамилия'):
                        director_parts.append(director_data['Фамилия'])
                    if director_data.get('Имя'):
                        director_parts.append(director_data['Имя'])
                    if director_data.get('Отчество'):
                        director_parts.append(director_data['Отчество'])

                    info['director'] = ' '.join(filter(None, director_parts))
                    info['director_position'] = director_data.get('Должность', '')

                # Контакты (если есть)
                if 'Контакты' in data:
                    contacts = data['Контакты']
                    if isinstance(contacts, dict):
                        info['phone'] = contacts.get('Телефон')
                        info['email'] = contacts.get('ЭлПочта')
                        info['website'] = contacts.get('Сайт')
                    elif isinstance(contacts, str):
                        # Может быть строка с телефоном
                        info['phone'] = contacts

                # Финансы (если есть)
                if 'Финансы' in data:
                    finances = data['Финансы']
                    if isinstance(finances, dict):
                        # Уставный капитал
                        uk = finances.get('УставныйКапитал')
                        if uk:
                            try:
                                # Убираем пробелы и приводим к числу
                                uk_clean = str(uk).replace(' ', '').replace(',', '.')
                                info['authorized_capital'] = float(uk_clean)
                            except:
                                info['authorized_capital'] = None

                        # Выручка и прибыль
                        info['revenue'] = finances.get('Выручка')
                        info['profit'] = finances.get('Прибыль')

        except Exception as e:
            logger.warning(f"Ошибка извлечения данных из API ответа: {e}")
            logger.warning(f"Структура данных: {json.dumps(api_data, ensure_ascii=False, indent=2)[:500]}")

        return info

    def _extract_legal_form(self, full_name):
        """Извлечение формы организации из полного названия"""
        if not full_name:
            return ''

        # Список возможных форм
        forms = {
            'ООО': ['ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ', 'ООО'],
            'АО': ['АКЦИОНЕРНОЕ ОБЩЕСТВО', 'АО', 'ПАО', 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО'],
            'ЗАО': ['ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'ЗАО'],
            'ИП': ['ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ', 'ИП'],
            'ПАО': ['ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'ПАО'],
            'НАО': ['НЕПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'НАО'],
            'ГУП': ['ГОСУДАРСТВЕННОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ', 'ГУП'],
            'МУП': ['МУНИЦИПАЛЬНОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ', 'МУП'],
        }

        full_name_upper = full_name.upper()

        for form, keywords in forms.items():
            for keyword in keywords:
                if keyword in full_name_upper:
                    return form

        return ''

    def _extract_legal_form(self, full_name):
        """Извлечение формы организации из полного названия"""
        if not full_name:
            return ''

        # Список возможных форм
        forms = {
            'ООО': ['ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ', 'ООО'],
            'АО': ['АКЦИОНЕРНОЕ ОБЩЕСТВО', 'АО', 'ПАО', 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО'],
            'ЗАО': ['ЗАКРЫТОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'ЗАО'],
            'ИП': ['ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ', 'ИП'],
            'ПАО': ['ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'ПАО'],
            'НАО': ['НЕПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО', 'НАО'],
            'ГУП': ['ГОСУДАРСТВЕННОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ', 'ГУП'],
            'МУП': ['МУНИЦИПАЛЬНОЕ УНИТАРНОЕ ПРЕДПРИЯТИЕ', 'МУП'],
        }

        full_name_upper = full_name.upper()

        for form, keywords in forms.items():
            for keyword in keywords:
                if keyword in full_name_upper:
                    return form

        return ''


class CompanyDataService:
    """Сервис для работы с данными компаний"""

    @staticmethod
    def fill_lead_form_data(company_data):
        """Подготовка данных для заполнения формы лида"""
        form_data = {}

        if not company_data:
            return form_data

        # Сопоставление полей
        mapping = {
            'company_name': 'company_name',
            'legal_form': 'legal_form',
            'legal_name': 'legal_name',
            'inn': 'inn',
            'ogrn': 'ogrn',
            'director_fio': 'director_fio',
            'address': 'address',
            'city': 'city',
            'phone': 'phone',
            'email': 'email',
            'website': 'website',
        }

        for form_field, company_field in mapping.items():
            if company_field in company_data and company_data[company_field]:
                form_data[form_field] = company_data[company_field]

        return form_data