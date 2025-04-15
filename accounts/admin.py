from django.contrib import admin
from .models import UserProfile, UsageLog, Subscription

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('email', 'subscription_tier', 'total_emails_transformed', 'auth_provider', 'created_at')
    search_fields = ('email', 'user_id')
    list_filter = ('subscription_tier', 'auth_provider')
    readonly_fields = ('user_id', 'auth_provider', 'created_at', 'updated_at')

@admin.register(UsageLog)
class UsageLogAdmin(admin.ModelAdmin):
    list_display = ('user_profile', 'timestamp', 'word_count', 'tone_selected')
    list_filter = ('timestamp', 'tone_selected')
    search_fields = ('user_profile__email',)
    date_hierarchy = 'timestamp'

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user_profile', 'subscription_id', 'start_date', 'end_date', 'is_active')
    list_filter = ('is_active', 'start_date')
    search_fields = ('user_profile__email', 'subscription_id')
    readonly_fields = ('start_date',)
