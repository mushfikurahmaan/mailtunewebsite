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
        Returns a tuple of (can_transform, reason) where reason is None if transformation is allowed
        """
        try:
            tier_limits = settings.USER_TIERS.get(self.subscription_tier, {'emails': 0, 'words': 0})
            email_limit = tier_limits.get('emails', 0)
            
            # Handle FREE tier users
            if self.subscription_tier == 'FREE':
                # Free users have a lifetime limit of 5 emails
                if self.total_emails_transformed >= 5:
                    return False, "Free tier limit of 5 emails reached. Please upgrade to continue."
                return True, None
            
            # Handle paid tier users
            else:
                # Get first day of current month
                today = timezone.now()
                month_start = datetime.datetime(today.year, today.month, 1, tzinfo=today.tzinfo)
                
                # Sum email count for current month from UsageLog
                monthly_emails = self.usagelog_set.filter(
                    timestamp__gte=month_start
                ).count()
                
                if monthly_emails >= email_limit:
                    return False, f"Monthly limit of {email_limit} emails reached for your {self.subscription_tier} plan."
                
                # Check if subscription is active
                try:
                    subscription = self.subscription_set.first()
                    if subscription and not subscription.is_active:
                        return False, "Your subscription is not active. Please renew to continue."
                except Exception:
                    # If there's an error checking subscription, default to allowing transformation
                    # but log this for monitoring
                    return True, None
                
                return True, None
        except Exception as e:
            # Log the exception but don't expose internal errors to user
            # In production, you would want to log this error properly
            # For now, we'll allow the transformation but with a warning
            return True, "Warning: Unable to verify usage limits"

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
    
    def increment_usage(self, word_count=0, tone="default"):
        """
        Increment the total number of emails transformed and log usage
        Returns a tuple of (success, message)
        """
        can_transform, reason = self.can_transform_email()
        
        if not can_transform:
            return False, reason
            
        # Increment email count
        self.total_emails_transformed += 1
        self.save()
        
        # Log the usage
        UsageLog.objects.create(
            user_profile=self,
            word_count=word_count,
            tone_selected=tone
        )
        
        return True, "Email transformation recorded successfully"

    def get_usage_stats(self):
        """
        Get comprehensive usage statistics for the dashboard
        """
        # Get tier limits
        tier_limits = settings.USER_TIERS.get(self.subscription_tier, {'emails': 0, 'words': 0})
        email_limit = tier_limits.get('emails', 0)
        word_limit = tier_limits.get('words', 0)
        
        # Calculate current usage
        today = timezone.now()
        month_start = datetime.datetime(today.year, today.month, 1, tzinfo=today.tzinfo)
        
        # Get monthly stats for all users
        monthly_emails = self.usagelog_set.filter(timestamp__gte=month_start).count()
        monthly_words = self.usagelog_set.filter(
            timestamp__gte=month_start
        ).aggregate(models.Sum('word_count'))['word_count__sum'] or 0
        
        # Handle free tier differently (lifetime limits)
        if self.subscription_tier == 'FREE':
            email_usage_percent = (self.total_emails_transformed / 5) * 100 if self.total_emails_transformed > 0 else 0
            total_words = self.usagelog_set.aggregate(models.Sum('word_count'))['word_count__sum'] or 0
            word_usage_percent = (total_words / word_limit) * 100 if word_limit > 0 else 0
        else:
            email_usage_percent = (monthly_emails / email_limit) * 100 if email_limit > 0 else 0
            word_usage_percent = (monthly_words / word_limit) * 100 if word_limit > 0 else 0
        
        # Calculate if user is approaching limits (80% or more)
        email_warning = email_usage_percent >= 80
        word_warning = word_usage_percent >= 80
        
        return {
            'email_limit': email_limit,
            'word_limit': word_limit,
            'emails_used': self.total_emails_transformed if self.subscription_tier == 'FREE' else monthly_emails,
            'words_used': total_words if self.subscription_tier == 'FREE' else monthly_words,
            'email_usage_percent': min(email_usage_percent, 100),  # Cap at 100%
            'word_usage_percent': min(word_usage_percent, 100),    # Cap at 100%
            'email_warning': email_warning,
            'word_warning': word_warning,
            'should_upgrade': email_warning or word_warning,
            'next_tier': self.get_next_tier(),
        }
    
    def get_next_tier(self):
        """
        Returns the next subscription tier for upgrades
        """
        tiers = [choice[0] for choice in self.SUBSCRIPTION_CHOICES]
        try:
            current_index = tiers.index(self.subscription_tier)
            if current_index < len(tiers) - 1:
                return tiers[current_index + 1]
        except ValueError:
            pass
        return None
    
    def can_downgrade(self):
        """
        Check if user can downgrade their subscription based on current usage
        """
        # Get current tier index
        tiers = [choice[0] for choice in self.SUBSCRIPTION_CHOICES]
        try:
            current_index = tiers.index(self.subscription_tier)
            if current_index <= 0:  # Already at lowest tier
                return False, "You are already on the lowest tier."
                
            # Check if downgrade would exceed limits
            target_tier = tiers[current_index - 1]
            target_limits = settings.USER_TIERS.get(target_tier, {'emails': 0, 'words': 0})
            
            # Calculate current month's usage
            today = timezone.now()
            month_start = datetime.datetime(today.year, today.month, 1, tzinfo=today.tzinfo)
            monthly_emails = self.usagelog_set.filter(timestamp__gte=month_start).count()
            monthly_words = self.usagelog_set.filter(
                timestamp__gte=month_start
            ).aggregate(models.Sum('word_count'))['word_count__sum'] or 0
            
            # Check if downgrade would exceed limits
            if monthly_emails > target_limits.get('emails', 0):
                return False, f"Your current month's email usage ({monthly_emails}) exceeds {target_tier} tier limit."
            
            if monthly_words > target_limits.get('words', 0):
                return False, f"Your current month's word usage ({monthly_words}) exceeds {target_tier} tier limit."
                
            return True, f"You can downgrade to {target_tier} tier."
            
        except (ValueError, IndexError):
            return False, "Unable to determine eligibility for downgrade."

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
    
    def is_expiring_soon(self, days_threshold=7):
        """
        Check if subscription is expiring soon (within days_threshold)
        """
        if not self.end_date or not self.is_active:
            return False
            
        time_remaining = self.end_date - timezone.now()
        return time_remaining.days <= days_threshold
    
    def get_renewal_url(self):
        """
        Generate renewal URL for Paddle checkout
        """
        # This would be implemented based on your Paddle integration
        # For example:
        # return f"{settings.PADDLE_CHECKOUT_URL}?product={settings.PADDLE_PRODUCT_IDS.get(self.user_profile.subscription_tier)}"
        return f"/renew-subscription/?tier={self.user_profile.subscription_tier}"
    
    def get_cancel_url(self):
        """
        Generate cancellation URL for Paddle
        """
        # This would be implemented based on your Paddle integration
        return f"/cancel-subscription/?subscription_id={self.subscription_id}"
    
    def update_from_paddle_webhook(self, webhook_data):
        """
        Update subscription details from Paddle webhook data
        """
        event_type = webhook_data.get('event_type')
        
        if event_type == 'subscription_created':
            self.subscription_id = webhook_data.get('subscription_id')
            self.start_date = timezone.now()
            self.is_active = True
            # Set end date based on billing cycle
            billing_period = webhook_data.get('billing_period', 30)  # Default to 30 days
            self.end_date = self.start_date + datetime.timedelta(days=billing_period)
            
        elif event_type == 'subscription_updated':
            # Handle plan changes, etc.
            plan_id = webhook_data.get('plan_id')
            # Map plan_id to subscription tier and update
            # self.user_profile.subscription_tier = map_paddle_plan_to_tier(plan_id)
            self.is_active = True
            
        elif event_type == 'subscription_cancelled':
            self.is_active = False
            
        elif event_type == 'subscription_payment_succeeded':
            # Extend subscription period
            billing_period = webhook_data.get('billing_period', 30)
            if self.end_date:
                self.end_date = self.end_date + datetime.timedelta(days=billing_period)
            else:
                self.end_date = timezone.now() + datetime.timedelta(days=billing_period)
            self.is_active = True
            
        self.save()
        
        # Also update the user profile if needed
        if event_type in ['subscription_created', 'subscription_updated']:
            plan_id = webhook_data.get('plan_id')
            # Example mapping logic - implement based on your Paddle setup
            tier_mapping = {
                'plan_starter': 'STARTER',
                'plan_premium': 'PREMIUM',
                'plan_business': 'BUSINESS'
            }
            new_tier = tier_mapping.get(plan_id)
            if new_tier and new_tier != self.user_profile.subscription_tier:
                self.user_profile.subscription_tier = new_tier
                self.user_profile.save()
