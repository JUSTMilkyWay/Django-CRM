from django.db import models

class KanbanColumn(models.Model):
    title = models.CharField(max_length=50)
    color = models.CharField(max_length=20, default="#2b2b2b")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class Lead(models.Model):
    company_name = models.CharField(max_length=100, blank=True, null=True)
    column = models.ForeignKey(
        KanbanColumn,
        on_delete=models.CASCADE,
        related_name='leads'
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.company_name or "Новый клиент"
