# Generated by Django 4.1.8 on 2025-01-13 07:55

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "theme",
                    models.CharField(
                        choices=[("dark", "Dark Mode"), ("light", "Light Mode")], default="dark", max_length=5
                    ),
                ),
                (
                    "default_view",
                    models.CharField(
                        choices=[("daily", "Daily View"), ("weekly", "Weekly View"), ("monthly", "Monthly View")],
                        default="daily",
                        max_length=7,
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="preferences",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Task",
            fields=[
                (
                    "id",
                    models.CharField(
                        default=uuid.uuid4, editable=False, max_length=36, primary_key=True, serialize=False
                    ),
                ),
                ("content", models.TextField()),
                ("date", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="tasks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-date", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="task",
            index=models.Index(fields=["date"], name="users_task_date_47911f_idx"),
        ),
        migrations.AddIndex(
            model_name="task",
            index=models.Index(fields=["user", "date"], name="users_task_user_id_f07b30_idx"),
        ),
    ]
