from django.db import models
from django.conf import settings
from django.utils import timezone
import datetime

class UserProfile(models.Model):
    """
    Extended profile for users with Supabase authentication integration.
    Stores only necessary metadata for compliance with GDPR.
    """
    SUBSCRIPTION_CHOICES = (
        ('FREE', 'Free'),
        ('STARTER', 'Starter'),
        ('PREMIUM', 'Premium'),
        ('BUSINESS', 'Business'),
    )
    
    user_id = models.CharField(max_length=255, unique=True, primary_key=True)
    auth_provider = models.CharField(max_length=50)  # e.g., 'google', 'facebook'
    email = models.EmailField(unique=True)
    subscription_tier = models.CharField(max_length=20, choices=SUBSCRIPTION_CHOICES, default='FREE')
    total_emails_transformed = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.email} ({self.subscription_tier})"
    
    def can_transform_email(self):
        """
        Check if user has reached their limit based on subscription tier
        """
        tier_limits = settings.USER_TIERS.get(self.subscription_tier, {'emails': 0, 'words': 0})
        email_limit = tier_limits.get('emails', 0)
        
        # Only check email limit for FREE users
        if self.subscription_tier == 'FREE':
            # Lifetime limit for free users
            return self.total_emails_transformed < email_limit
        else:
            # For paid tiers, we'd check the monthly usage
            # This is a placeholder - in production, would calculate monthly usage
            return True

    def check_word_limit(self):
        """
        Check if user has reached their word limit
        """
        tier_limits = settings.USER_TIERS.get(self.subscription_tier, {'emails': 0, 'words': 0})
        word_limit = tier_limits.get('words', 0)
        
        # For free users, check lifetime word usage
        if self.subscription_tier == 'FREE':
            total_words = self.usagelog_set.aggregate(models.Sum('word_count'))['word_count__sum'] or 0
            return total_words < word_limit
        
        # For paid users, check monthly word usage
        else:
            # Get first day of current month
            today = timezone.now()
            month_start = datetime.datetime(today.year, today.month, 1, tzinfo=today.tzinfo)
            
            # Sum word count for current month
            monthly_words = self.usagelog_set.filter(
                timestamp__gte=month_start
            ).aggregate(models.Sum('word_count'))['word_count__sum'] or 0
            
            return monthly_words < word_limit
    
    def increment_usage(self):
        """
        Increment the total number of emails transformed
        """
        self.total_emails_transformed += 1
        self.save()

class UsageLog(models.Model):
    """
    Logs usage statistics without storing email content - GDPR compliant
    """
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    word_count = models.PositiveIntegerField()
    tone_selected = models.CharField(max_length=50)
    
    def __str__(self):
        return f"{self.user_profile.email} at {self.timestamp}"

class Subscription(models.Model):
    """
    Stores subscription details for paid users
    """
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    subscription_id = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.user_profile.email} - {self.user_profile.subscription_tier}"
