from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
import json
from .services.api_service import CheckoAPIService


@login_required
def test_api_view(request):
    """Тестовая страница для работы с API"""
    return render(request, 'companies/test_api.html')


@login_required
@csrf_exempt
def get_company_by_inn(request):
    """API endpoint для получения данных компании по ИНН"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            inn = data.get('inn', '').strip()

            if not inn:
                return JsonResponse({'error': 'ИНН не указан'}, status=400)

            # Получаем данные
            api_service = CheckoAPIService(user=request.user)
            company_data = api_service.get_company_by_inn(inn)

            if company_data:
                return JsonResponse({
                    'success': True,
                    'data': company_data,
                    'message': 'Данные успешно получены'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Не удалось получить данные по ИНН'
                }, status=404)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Неверный формат JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Метод не разрешен'}, status=405)


# companies/views.py
import pandas as pd
from io import BytesIO
from django.http import HttpResponse


@login_required
def export_company_excel(request, inn):
    """Экспорт данных компании в Excel"""
    try:
        # Получаем данные через API сервис
        from .services.api_service import CheckoAPIService
        api_service = CheckoAPIService(user=request.user)
        company_data = api_service.get_company_by_inn(inn)

        if not company_data:
            return JsonResponse({'error': 'Компания не найдена'}, status=404)

        # Подготовка данных для Excel
        excel_data = [
            ['Данные компании', ''],
            ['ИНН', company_data.get('inn', '')],
            ['Краткое название', company_data.get('company_name', '')],
            ['Полное юридическое название', company_data.get('legal_name', '')],
            ['Организационно-правовая форма', company_data.get('legal_form', '')],
            ['', ''],
            ['Регистрационные данные', ''],
            ['ОГРН', company_data.get('ogrn', '')],
            ['КПП', company_data.get('kpp', '')],
            ['ОКПО', company_data.get('okpo', '')],
            ['ОКВЭД', company_data.get('okved', '')],
            ['Статус', company_data.get('status', '')],
            ['Дата регистрации', company_data.get('registration_date', '')],
            ['', ''],
            ['Адресные данные', ''],
            ['Юридический адрес', company_data.get('address', '')],
            ['Город/Населенный пункт', company_data.get('city', '')],
            ['Регион', company_data.get('region', '')],
            ['Почтовый индекс', company_data.get('postal_code', '')],
            ['', ''],
            ['Руководство', ''],
            ['Генеральный директор', company_data.get('director_fio', '')],
            ['Должность руководителя', company_data.get('director_position', '')],
            ['', ''],
            ['Контактная информация', ''],
            ['Телефон', company_data.get('phone', '')],
            ['Электронная почта', company_data.get('email', '')],
            ['Веб-сайт', company_data.get('website', '')],
            ['', ''],
            ['Финансовые показатели', ''],
            ['Уставный капитал', company_data.get('authorized_capital', '')],
            ['Выручка', company_data.get('revenue', '')],
            ['Прибыль', company_data.get('profit', '')],
            ['', ''],
            ['Дополнительная информация', ''],
            ['Источник данных', company_data.get('source', '')],
            ['Дата обновления', company_data.get('last_updated', '')],
            ['Запрошено пользователем', request.user.get_full_name() or request.user.username],
            ['Дата экспорта', datetime.now().strftime('%d.%m.%Y %H:%M:%S')],
        ]

        # Создаем DataFrame
        df = pd.DataFrame(excel_data, columns=['Параметр', 'Значение'])

        # Создаем Excel файл в памяти
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Данные компании', index=False)

            # Получаем лист для форматирования
            worksheet = writer.sheets['Данные компании']

            # Форматирование: жирный шрифт для заголовков разделов
            for row in range(1, len(excel_data) + 1):
                cell_value = worksheet.cell(row=row, column=1).value
                if cell_value and cell_value.upper() == cell_value and cell_value != '':
                    worksheet.cell(row=row, column=1).font = pd.ExcelWriter.workbook.add_format({'bold': True})
                    worksheet.cell(row=row, column=2).font = pd.ExcelWriter.workbook.add_format({'bold': True})

            # Автонастройка ширины колонок
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        cell_length = len(str(cell.value))
                        if cell_length > max_length:
                            max_length = cell_length
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width

        # Подготовка ответа
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

        # Имя файла
        company_name_clean = ''.join(c for c in (company_data.get('company_name', 'company') or 'company') if
                                     c.isalnum() or c in (' ', '-', '_')).rstrip()
        filename = f"{company_name_clean}_{inn}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response

    except Exception as e:
        logger.error(f"Ошибка экспорта Excel для ИНН {inn}: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)