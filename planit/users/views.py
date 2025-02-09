from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.contrib.messages.views import SuccessMessageMixin
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views.generic import DetailView, RedirectView, UpdateView, TemplateView
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from datetime import datetime, timedelta
import json
from .models import Task
from django.utils import timezone
from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views import View

User = get_user_model()




class UserRedirectView(LoginRequiredMixin, RedirectView):
    permanent = False

    def get_redirect_url(self):
        return reverse("users:detail", kwargs={"pk": self.request.user.pk})


user_redirect_view = UserRedirectView.as_view()

@method_decorator(login_required, name='dispatch')
class TasksView(View):
    def get(self, request):
        """Get tasks for a date range"""
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        view_type = request.GET.get('view_type', 'daily')  # daily, weekly, monthly
        
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            tasks = Task.objects.filter(
                user=request.user,
                date__range=[start, end]
            ).order_by('date', '-created_at')
            
            # Format response based on view type
            if view_type == 'daily':
                tasks_dict = {
                    start_date: [task.to_dict() for task in tasks]
                }
            else:
                tasks_dict = {}
                for task in tasks:
                    date_key = task.date.strftime('%Y-%m-%d')
                    if date_key not in tasks_dict:
                        tasks_dict[date_key] = []
                    tasks_dict[date_key].append(task.to_dict())
            
            return JsonResponse({
                'status': 'success',
                'tasks': tasks_dict,
                'view_type': view_type
            })
            
        except (ValueError, TypeError):
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid date format'
            }, status=400)

@method_decorator(login_required, name='dispatch')
class TaskView(View):
    def post(self, request):
        """Create a new task"""
        try:
            data = json.loads(request.body)
            content = data.get('content')
            date_str = data.get('dateKey')
            
            if not content or not date_str:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Missing required fields'
                }, status=400)
                
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            task = Task.objects.create(
                content=content,
                date=date,
                user=request.user
            )
            
            return JsonResponse({
                'status': 'success',
                'task': task.to_dict()
            })
            
        except (ValueError, json.JSONDecodeError):
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid request data'
            }, status=400)
    
    def put(self, request, task_id):
        """Update task content or completion status"""
        try:
            task = Task.objects.get(id=task_id, user=request.user)
            data = json.loads(request.body)
            
            # Update completion status if provided
            if 'completed' in data:
                task.completed = data['completed']
            
            # Update content if provided
            if 'content' in data:
                task.content = data['content']
            
            task.save()
            
            return JsonResponse({
                'status': 'success',
                'task': task.to_dict()
            })
            
        except Task.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': 'Task not found'
            }, status=404)
        except json.JSONDecodeError:
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid request data'
            }, status=400)
    
    def delete(self, request, task_id):
        """Delete a task"""
        try:
            task = Task.objects.get(id=task_id, user=request.user)
            task.delete()
            return JsonResponse({'status': 'success'})
            
        except Task.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': 'Task not found'
            }, status=404)

class HomeView(LoginRequiredMixin, TemplateView):
    template_name = "pages/home.html"
    
    def get_context_data(self, **kwargs):
        print("\n\n*** HomeView is being called ***\n\n")
        context = super().get_context_data(**kwargs)
        
        # Get today's date
        today = timezone.now().date()
        print(f"Today's date: {today}")
        
        # Get start and end of current week
        week_start = today - timedelta(days=today.weekday())  # Start from Monday
        week_end = week_start + timedelta(days=6)
        print(f"Week range: {week_start} to {week_end}")
        
        # Get start and end of current month
        month_start = today.replace(day=1)
        next_month = month_start.replace(day=28) + timedelta(days=4)
        month_end = next_month - timedelta(days=next_month.day)
        print(f"Month range: {month_start} to {month_end}")
        
        # Get tasks for today
        today_tasks = Task.objects.filter(
            user=self.request.user,
            date=today
        ).order_by('-created_at')
        print(f"Today's tasks count: {today_tasks.count()}")
        
        # Format tasks for frontend
        today_data = {
            today.strftime('%Y-%m-%d'): [task.to_dict() for task in today_tasks]
        }
        print(f"Today's data: {today_data}")
        
        # Get tasks for current week
        week_tasks = Task.objects.filter(
            user=self.request.user,
            date__range=[week_start, week_end]
        ).order_by('date', '-created_at')
        print(f"Week tasks count: {week_tasks.count()}")
        
        # Group week tasks by date
        week_data = {}
        for task in week_tasks:
            date_key = task.date.strftime('%Y-%m-%d')
            if date_key not in week_data:
                week_data[date_key] = []
            week_data[date_key].append(task.to_dict())
        print(f"Week data: {week_data}")
        
        # Get tasks for current month
        month_tasks = Task.objects.filter(
            user=self.request.user,
            date__range=[month_start, month_end]
        ).order_by('date', '-created_at')
        print(f"Month tasks count: {month_tasks.count()}")
        
        # Group month tasks by date
        month_data = {}
        for task in month_tasks:
            date_key = task.date.strftime('%Y-%m-%d')
            if date_key not in month_data:
                month_data[date_key] = []
            month_data[date_key].append(task.to_dict())
        print(f"Month data: {month_data}")
        
        # Format initial data for frontend
        initial_data = {
            'today': today_data,
            'week': week_data,
            'month': month_data,
            'currentDate': today.strftime('%Y-%m-%d')
        }
        
        # Serialize the data to JSON
        context['initial_data'] = json.dumps(initial_data)
        print(f"Final context initial_data: {context['initial_data']}")
        
        return context
