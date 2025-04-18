from django.http import JsonResponse
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def supabase_config(request):
    """
    Serve Supabase configuration from environment variables.
    This endpoint will be called from the frontend to get the Supabase URL and key.
    """
    return JsonResponse({
        'url': settings.SUPABASE_URL,
        'key': settings.SUPABASE_KEY
    }) 