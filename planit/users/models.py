from django.contrib.auth.models import AbstractUser
from django.db.models import (
    CharField, 
    EmailField, 
    Model, 
    TextField, 
    DateField, 
    DateTimeField, 
    ForeignKey, 
    OneToOneField,
    CASCADE,
    SET_NULL
)
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
import uuid
from django.db import models
from planit.users.managers import UserManager


class Account(AbstractUser):
    """
    Default custom user model for planit.
    If adding fields that need to be filled at user signup,
    check forms.SignupForm and forms.SocialSignupForms accordingly.
    """

    # First and last name do not cover name patterns around the globe
    name = CharField(_("Name of User"), blank=True, max_length=255)
    first_name = None  # type: ignore
    last_name = None  # type: ignore
    email = EmailField(_("email address"), unique=True)
    username = None  # type: ignore

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def get_absolute_url(self) -> str:
        """Get URL for user's detail view.

        Returns:
            str: URL for user detail.

        """
        return reverse("users:detail", kwargs={"pk": self.id})


class Task(Model):
    """
    Model to store calendar tasks/notes for both anonymous and authenticated users
    """
    id = CharField(primary_key=True, default=uuid.uuid4, editable=False, max_length=36)
    content = TextField()
    date = DateField()
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    user = ForeignKey(
        Account,
        on_delete=SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['user', 'date']),
        ]


class UserPreference(Model):
    """
    Model to store user preferences like theme and default calendar view
    """
    THEME_CHOICES = (
        ('dark', 'Dark Mode'),
        ('light', 'Light Mode'),
    )
    VIEW_CHOICES = (
        ('daily', 'Daily View'),
        ('weekly', 'Weekly View'),
        ('monthly', 'Monthly View'),
    )

    user = OneToOneField(Account, on_delete=CASCADE, related_name='preferences')
    theme = CharField(max_length=5, choices=THEME_CHOICES, default='dark')
    default_view = CharField(max_length=7, choices=VIEW_CHOICES, default='daily')

    def __str__(self):
        return f"{self.user.email}'s preferences"
