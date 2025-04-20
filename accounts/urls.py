from django.urls import path
from . import views
from .views_auth import supabase_config, domain_config

app_name = 'accounts'

urlpatterns = [
    # Frontend pages
    path('signup/', views.signup_page, name='signup_page'),
    path('signin/', views.signin_page, name='signin_page'),
    path('dashboard/', views.dashboard_page, name='dashboard_page'),
    path('checkout/', views.checkout_page, name='checkout_page'),
    path('manage/', views.manage_page, name='manage_page'),
    path('auth-callback/', views.auth_callback, name='auth_callback'),
    
    # API endpoints
    path('register/', views.register_user, name='register_user'),
    path('profile/', views.get_user_profile, name='get_user_profile'),
    path('subscribe/', views.update_subscription, name='update_subscription'),
    path('supabase-config/', supabase_config, name='supabase_config'),
    path('domain-config/', domain_config, name='domain_config'),
    path('test-db/', views.test_db_connection, name='test_db_connection'),
] 