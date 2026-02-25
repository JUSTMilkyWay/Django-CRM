from django.shortcuts import render
from django.http import HttpResponse
from .converters.txt51_to_excel import convert_txt_files


def tools_main(request):
    return render(request, "tools/tools_main.html")


def txt51_to_excel(request):
    if request.method == "POST":
        files = request.FILES.getlist("txt_files")
        return convert_txt_files(files)

    return render(request, "tools/txt51_to_excel.html")