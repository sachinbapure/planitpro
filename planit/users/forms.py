from django import forms
from allauth.account.forms import SignupForm
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSignupForm(SignupForm):
    name = forms.CharField(max_length=255, required=True)
    
    def save(self, request):
        user = super().save(request)
        user.name = self.cleaned_data['name']
        user.save()
        return user
