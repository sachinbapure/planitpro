from django.urls import path
from .views import HomeView, TasksView, TaskView

app_name = "users"
urlpatterns = [
    path("api/tasks/", TasksView.as_view(), name="tasks"),
    path("api/task/", TaskView.as_view(), name="task_create"),
    path("api/task/<uuid:task_id>/", TaskView.as_view(), name="task_detail"),
]
