from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from django.core.cache import cache
import hashlib
import json
from datetime import datetime, timedelta
from django.db import models

from accounts.models import UserProfile, UsageLog, Subscription
from ai_service.services import AIEmailTransformer

# Create your views here.

@api_view(['POST'])
def transform_email(request):
    """
    Transform email using AI based on user preferences
    """
    user_profile = request.user_profile
    data = request.data
    
    # Get input parameters
    original_email = data.get('user_inputed_original_email', '')
    tone = data.get('tone', 'Professional')
    context = data.get('context', 'Workplace')
    intent = data.get('intent', 'Request')
    intensity = data.get('intensity', '2')
    
    if not original_email:
        return Response({
            'error': 'Email content is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user has reached email limit (only check email limit, not word limit)
    tier_limits = settings.USER_TIERS.get(user_profile.subscription_tier, {'emails': 0, 'words': 0})
    email_limit = tier_limits.get('emails', 0)
    
    if user_profile.subscription_tier == 'FREE' and user_profile.total_emails_transformed >= email_limit:
        error_message = 'You have reached your email limit. Please upgrade your plan.'
        return Response({
            'error': error_message,
            'limit_reached': True,
            'subscription_tier': user_profile.subscription_tier
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Create cache key based on input parameters to avoid processing identical requests
    cache_key = _create_cache_key(original_email, tone, context, intent, intensity)
    cached_response = cache.get(cache_key)
    
    if cached_response:
        # If identical transformation was requested recently, use cached result
        result = cached_response
    else:
        # Transform the email
        transformer = AIEmailTransformer()
        transformed_text, word_count = transformer.transform_email(
            original_email, tone, context, intent, intensity
        )
        
        result = {
            'transformed_text': transformed_text
        }
        
        # Cache the result for future identical requests (30 minute expiry)
        cache.set(cache_key, result, 60 * 30)
        
        # Log the usage - we still track words used for analytics, but don't limit based on it
        UsageLog.objects.create(
            user_profile=user_profile,
            word_count=word_count,
            tone_selected=tone
        )
        
        # Update usage counter
        user_profile.increment_usage()
    
    # Add remaining count to the response
    tier_limits = settings.USER_TIERS.get(user_profile.subscription_tier, {'emails': 0, 'words': 0})
    email_limit = tier_limits.get('emails', 0)
    
    # Get current usage for response
    if user_profile.subscription_tier == 'FREE':
        # For free tier, calculate remaining based on total usage
        emails_remaining = max(0, email_limit - user_profile.total_emails_transformed)
    else:
        # For paid tiers, the limit resets monthly
        emails_remaining = email_limit
    
    result['remaining_transforms'] = emails_remaining
    
    return Response(result)

@api_view(['GET'])
def get_user_usage(request):
    """
    Get the user's current usage data including subscription details
    """
    user_profile = request.user_profile
    
    print(f"User {user_profile.email} has subscription_tier: {user_profile.subscription_tier}")
    
    # FORCE FREE TIER FOR NOW - DEBUGGING
    # Remove this line after debugging is complete
    user_profile.subscription_tier = 'FREE'
    
    # Ensure subscription_tier is set, default to FREE if not
    if not user_profile.subscription_tier or user_profile.subscription_tier not in dict(UserProfile.SUBSCRIPTION_CHOICES).keys():
        print(f"Setting subscription_tier to FREE for user {user_profile.email}")
        user_profile.subscription_tier = 'FREE'
        user_profile.save()
    
    # Get the user's subscription details
    subscription = None
    try:
        subscription = Subscription.objects.get(user_profile=user_profile)
    except Subscription.DoesNotExist:
        # No subscription record exists, create default values
        pass
    
    # Get tier limits from settings
    tier_limits = settings.USER_TIERS.get(user_profile.subscription_tier, {'emails': 0, 'words': 0})
    email_limit = tier_limits.get('emails', 0)
    words_limit = tier_limits.get('words', 0)
    
    # Ensure we're using the exact limits from settings
    if user_profile.subscription_tier == 'FREE':
        email_limit = settings.USER_TIERS['FREE']['emails']
        words_limit = settings.USER_TIERS['FREE']['words']
    elif user_profile.subscription_tier == 'STARTER':
        email_limit = settings.USER_TIERS['STARTER']['emails']
        words_limit = settings.USER_TIERS['STARTER']['words']
    elif user_profile.subscription_tier == 'PREMIUM':
        email_limit = settings.USER_TIERS['PREMIUM']['emails']
        words_limit = settings.USER_TIERS['PREMIUM']['words']
    elif user_profile.subscription_tier == 'BUSINESS':
        email_limit = settings.USER_TIERS['BUSINESS']['emails']
        words_limit = settings.USER_TIERS['BUSINESS']['words']
    
    # Calculate words used this month by aggregating usage logs
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    word_logs = UsageLog.objects.filter(
        user_profile=user_profile,
        timestamp__gte=current_month_start
    )
    
    total_words_transformed = sum(log.word_count for log in word_logs)
    
    # For free tier, use lifetime words rather than monthly
    if user_profile.subscription_tier == 'FREE':
        # Get all logs, not just this month
        all_logs = UsageLog.objects.filter(user_profile=user_profile)
        total_words_transformed = sum(log.word_count for log in all_logs)
    
    # Calculate renewal date and days remaining
    renewal_date = "N/A"
    days_until_renewal = 0
    
    if subscription and subscription.is_active and subscription.end_date:
        renewal_date = subscription.end_date.strftime("%B %d, %Y")
        days_until_renewal = (subscription.end_date - datetime.now().replace(tzinfo=subscription.end_date.tzinfo)).days
    elif user_profile.subscription_tier != 'FREE':
        # For paid subscriptions without an end_date, calculate based on monthly renewal
        # Find the next renewal date based on creation date
        if subscription and subscription.start_date:
            start_date = subscription.start_date
        else:
            start_date = user_profile.created_at
            
        # Calculate days until next monthly renewal
        now = datetime.now().replace(tzinfo=start_date.tzinfo)
        next_renewal = start_date.replace(day=start_date.day, month=now.month, year=now.year)
        if next_renewal < now:
            # If we've already passed this month's renewal date, go to next month
            if now.month == 12:
                next_renewal = next_renewal.replace(month=1, year=now.year + 1)
            else:
                next_renewal = next_renewal.replace(month=now.month + 1)
        
        renewal_date = next_renewal.strftime("%B %d, %Y")
        days_until_renewal = (next_renewal - now).days
    
    # For free tier, there's no renewal
    if user_profile.subscription_tier == 'FREE':
        renewal_date = "Never (Free plan)"
        days_until_renewal = 0
    
    # Return usage data
    response_data = {
        'subscription_tier': user_profile.subscription_tier,
        'total_emails_transformed': user_profile.total_emails_transformed,
        'total_words_transformed': total_words_transformed,
        'email_limit': email_limit,
        'words_limit': words_limit,
        'renewal_date': renewal_date,
        'days_until_renewal': days_until_renewal
    }
    
    # Include plan upgrade eligibility information
    can_upgrade = user_profile.subscription_tier != 'BUSINESS'
    response_data['can_upgrade'] = can_upgrade
    
    # Include recent activity
    recent_activity = UsageLog.objects.filter(user_profile=user_profile).order_by('-timestamp')[:5]
    recent_activity_data = []
    
    for log in recent_activity:
        recent_activity_data.append({
            'id': log.id,
            'timestamp': log.timestamp.strftime("%b %d, %I:%M %p"),
            'word_count': log.word_count,
            'tone': log.tone_selected
        })
    
    response_data['recent_activity'] = recent_activity_data
    
    return Response(response_data)

def _create_cache_key(original_email, tone, context, intent, intensity):
    """
    Create a unique cache key based on transformation parameters
    """
    combined = f"{original_email}|{tone}|{context}|{intent}|{intensity}"
    return f"email_transform_{hashlib.md5(combined.encode()).hexdigest()}"
