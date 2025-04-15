from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    path('transform/', views.transform_email, name='transform_email'),
    path('user/usage/', views.get_user_usage, name='get_user_usage'),
] 