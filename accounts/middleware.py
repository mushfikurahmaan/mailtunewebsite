import jwt
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from jose import JWTError
from .models import UserProfile

class SupabaseJWTMiddleware(MiddlewareMixin):
    """
    Middleware to validate Supabase JWT tokens from incoming requests.
    """
    
    def process_request(self, request):
        # Skip middleware for authentication endpoints, admin, and home page
        exempt_paths = ['/accounts/login/', '/accounts/signin/', '/accounts/signup/', '/admin/', '/']
        if any(request.path.startswith(path) for path in exempt_paths):
            return None
            
        # Check for token in Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'Authentication required'}, status=401)
            
        token = auth_header.split(' ')[1]
        
        try:
            # Validate the JWT token
            payload = jwt.decode(
                token, 
                settings.JWT_AUTH['JWT_SECRET_KEY'],
                algorithms=[settings.JWT_AUTH['JWT_ALGORITHM']]
            )
            
            # Get the Supabase user ID from token
            user_id = payload.get('sub')
            if not user_id:
                return JsonResponse({'error': 'Invalid token'}, status=401)
                
            # Attach user to request
            try:
                user_profile = UserProfile.objects.get(user_id=user_id)
                request.user_profile = user_profile
            except UserProfile.DoesNotExist:
                return JsonResponse({'error': 'User not found'}, status=404)
                
        except JWTError:
            return JsonResponse({'error': 'Invalid token'}, status=401)
            
        return None 