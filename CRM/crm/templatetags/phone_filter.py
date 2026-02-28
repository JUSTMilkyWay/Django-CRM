# crm/templatetags/phone_filter.py
import re
from django import template

register = template.Library()


@register.filter
def format_phone(value):
    """Форматирует телефон: +7 (999) 123-45-67"""
    if not value:
        return ''
    # Оставляем только цифры
    digits = re.sub(r'\D', '', str(value))

    if len(digits) == 11 and digits.startswith(('7', '8')):
        return f'+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}'
    if len(digits) == 10:
        return f'+7 ({digits[0:3]}) {digits[3:6]}-{digits[6:8]}-{digits[8:10]}'

    return value