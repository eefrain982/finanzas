from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0007_add_credit_card_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="cardexpense",
            name="mes_actual",
            field=models.PositiveSmallIntegerField(default=1),
        ),
    ]
