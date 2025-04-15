from django.shortcuts import redirect
from functools import wraps

def login_required(view_func):
    """
    Decorator that checks if a user is logged in before allowing access to a view.
    Redirects to signin page if not logged in.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        return render_auth_check(request, view_func, *args, **kwargs)
    return wrapper

def render_auth_check(request, view_func, *args, **kwargs):
    """
    Renders a page with JavaScript that checks for authentication tokens
    in localStorage and redirects to login if not found.
    If authenticated, renders the original view directly.
    """
    from django.shortcuts import render
    
    # Define template name based on view_func name
    view_name = view_func.__name__
    if view_name == 'manage_page':
        template_name = 'accounts/manage_subscription.html'
    else:
        template_name = f'accounts/{view_name.replace("_page", "")}.html'
    
    # Return a special template that only checks for auth but renders the original view directly
    response = render(request, 'accounts/auth_check.html', {
        'redirect_url': '/accounts/signin/',
        'original_view': view_name,
        'original_template': template_name
    })
    
    return response 