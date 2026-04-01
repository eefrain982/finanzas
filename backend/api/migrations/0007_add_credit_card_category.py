from django.db import migrations


def add_credit_card_category(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Category.objects.get_or_create(
        name="Pago Tarjeta de Crédito",
        defaults={
            "icon": "💳",
            "color": "#6366F1",
            "type": "expense",
        },
    )


def remove_credit_card_category(apps, schema_editor):
    Category = apps.get_model("api", "Category")
    Category.objects.filter(name="Pago Tarjeta de Crédito").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_credit_cards"),
    ]

    operations = [
        migrations.RunPython(add_credit_card_category, remove_credit_card_category),
    ]
