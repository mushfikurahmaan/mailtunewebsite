from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import json
import jwt
from datetime import datetime, timedelta
from .models import UserProfile, Subscription
from .decorators import login_required

def signup_page(request):
    """Render the signup page and store selected plan in session"""
    # Get the plan from the query parameters and default to FREE
    plan = request.GET.get('plan', 'FREE').upper()
    
    # Validate plan is a valid subscription tier
    valid_tiers = dict(UserProfile.SUBSCRIPTION_CHOICES).keys()
    if plan not in valid_tiers:
        plan = 'FREE'
    
    # Store the plan in the session for later use
    request.session['selected_plan'] = plan
    
    return render(request, 'registration/signup.html')

def signin_page(request):
    """Render the signin page"""
    return render(request, 'registration/signin.html')

@login_required
def dashboard_page(request):
    """Render the dashboard page"""
    return render(request, 'accounts/dashboard.html')

@login_required
def manage_page(request):
    """Render the manage page"""
    return render(request, 'accounts/manage_subscription.html')

@login_required
def checkout_page(request):
    """Render the checkout page"""
    return render(request, 'accounts/checkout.html')

def auth_callback(request):
    """
    Handle OAuth callback from Supabase.
    This page will redirect back to the signup page, which will
    detect the authenticated session and proceed with registration.
    """
    return render(request, 'registration/auth-callback.html')

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user from Supabase auth
    """
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        email = data.get('email')
        auth_provider = data.get('auth_provider', 'unknown')
        name = data.get('name')  # Get name from auth provider metadata
        avatar_url = data.get('avatar_url')  # Get avatar URL from auth provider
        
        if not user_id or not email:
            return JsonResponse({'error': 'Missing required fields'}, status=400)
            
        # Create user profile
        user_profile, created = UserProfile.objects.get_or_create(
            user_id=user_id,
            defaults={
                'email': email,
                'auth_provider': auth_provider
            }
        )
        
        # Generate JWT token
        token_payload = {
            'sub': user_id,
            'email': email,
            'name': name,  # Add name to token payload
            'exp': datetime.utcnow() + timedelta(days=30)
        }
        
        token = jwt.encode(
            token_payload,
            settings.JWT_AUTH['JWT_SECRET_KEY'],
            algorithm=settings.JWT_AUTH['JWT_ALGORITHM']
        )
        
        # Check if a plan was selected and determine redirect URL
        selected_plan = request.session.get('selected_plan', 'FREE')
        
        # Validate the selected plan is a valid subscription choice
        valid_tiers = dict(UserProfile.SUBSCRIPTION_CHOICES).keys()
        if selected_plan not in valid_tiers:
            selected_plan = 'FREE'
        
        # For new users, always set the subscription tier to FREE initially
        # They can upgrade later if needed
        if created:
            user_profile.subscription_tier = 'FREE'
            user_profile.save()
        # Only update the tier if the user specifically selected a paid plan
        elif selected_plan != 'FREE':
            user_profile.subscription_tier = selected_plan
            user_profile.save()
        
        # Determine redirect URL based on plan
        if selected_plan == 'FREE':
            redirect_url = '/accounts/dashboard/'
        else:
            redirect_url = '/accounts/checkout/'
            
        return JsonResponse({
            'token': token,
            'user': {
                'id': user_profile.user_id,
                'email': user_profile.email,
                'subscription_tier': user_profile.subscription_tier,
                'emails_transformed': user_profile.total_emails_transformed,
                'name': name,  # Include name in response
                'avatar_url': avatar_url  # Include avatar URL in response
            },
            'redirect_url': redirect_url
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
def get_user_profile(request):
    """
    Get the user profile details
    """
    user_profile = request.user_profile
    
    return Response({
        'user_id': user_profile.user_id,
        'email': user_profile.email,
        'subscription_tier': user_profile.subscription_tier,
        'emails_transformed': user_profile.total_emails_transformed,
        'remaining_transforms': get_remaining_transforms(user_profile),
        'auth_provider': user_profile.auth_provider,
        'created_at': user_profile.created_at
    })

@api_view(['POST'])
def update_subscription(request):
    """
    Update user subscription after successful payment
    """
    user_profile = request.user_profile
    data = request.data
    
    subscription_tier = data.get('subscription_tier')
    subscription_id = data.get('subscription_id')
    
    if not subscription_tier or subscription_tier not in dict(UserProfile.SUBSCRIPTION_CHOICES).keys():
        return Response({'error': 'Invalid subscription tier'}, status=status.HTTP_400_BAD_REQUEST)
    
    user_profile.subscription_tier = subscription_tier
    user_profile.save()
    
    # Update or create subscription record
    subscription, created = Subscription.objects.get_or_create(
        user_profile=user_profile,
        defaults={
            'subscription_id': subscription_id,
            'is_active': True,
            'payment_method': data.get('payment_method', 'unknown')
        }
    )
    
    if not created:
        subscription.subscription_id = subscription_id
        subscription.is_active = True
        subscription.save()
    
    # Create a complete user data object for localStorage update
    user_data = {
        'id': user_profile.user_id,
        'email': user_profile.email,
        'subscription_tier': user_profile.subscription_tier,
        'emails_transformed': user_profile.total_emails_transformed,
        'remaining_transforms': get_remaining_transforms(user_profile)
    }
    
    return Response({
        'status': 'success',
        'user': user_data
    })

def get_remaining_transforms(user_profile):
    """
    Calculate remaining transforms based on user tier and usage
    """
    tier_limits = settings.USER_TIERS.get(user_profile.subscription_tier, {'emails': 0})
    email_limit = tier_limits.get('emails', 0)
    
    if user_profile.subscription_tier == 'FREE':
        return max(0, email_limit - user_profile.total_emails_transformed)
    else:
        # For paid tiers, we would calculate based on current billing period
        # This is a simplified version - in production, would calculate monthly usage
        return email_limit
