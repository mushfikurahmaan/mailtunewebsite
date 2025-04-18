from django.conf import settings

def settings_context(request):
    """
    Make certain settings available to all templates.
    """
    return {
        'PRODUCTION_DOMAIN': settings.PRODUCTION_DOMAIN,
    } 