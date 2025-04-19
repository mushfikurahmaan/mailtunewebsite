// This script handles the auth callback page
document.addEventListener('DOMContentLoaded', async function() {
    // Get the Supabase configuration from the server
    let supabaseClient;
    const messageEl = document.getElementById('auth-message');
    
    try {
        // Check for error parameters in URL and handle them directly
        const urlParams = new URLSearchParams(window.location.search);
        const urlError = urlParams.get('error');
        const urlErrorDesc = urlParams.get('error_description');
        
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hashError = hashParams.get('error');
        const hashErrorDesc = hashParams.get('error_description');
        
        // Remove error parameters from URL to prevent issues on refresh
        if ((urlError || hashError) && window.history) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState(null, '', cleanUrl);
        }
        
        // Check specifically for the "Database error saving new user" message
        // This indicates the user exists in Supabase but the registration failed
        const errorDesc = urlErrorDesc || hashErrorDesc;
        if (errorDesc && errorDesc.includes('Database error saving new user')) {
            console.log("Detected database error from Supabase, will try to get session directly");
            // We'll continue with the flow and try to get the session directly
        }
        
        // Fetch configuration from the server
        const response = await fetch('/accounts/supabase-config/');
        if (!response.ok) {
            throw new Error('Failed to load Supabase configuration');
        }
        
        const config = await response.json();
        
        // Initialize the Supabase client with the fetched credentials
        supabaseClient = window.supabase.createClient(config.url, config.key);
        
        // Check if user is already logged in with valid token
        const token = localStorage.getItem('mailtune_token');
        const userData = localStorage.getItem('mailtune_user');
        
        if (token && userData) {
            // Already authenticated, check for next path or redirect to dashboard
            const nextPath = localStorage.getItem('next_path');
            
            if (messageEl) {
                messageEl.textContent = nextPath 
                    ? 'Already authenticated! Redirecting to your destination...' 
                    : 'Already authenticated! Redirecting to dashboard...';
                messageEl.style.color = '#A15DF8';
            }
            
            // Short timeout to allow message to be seen
            setTimeout(() => {
                if (nextPath) {
                    // Clear the stored path and redirect
                    localStorage.removeItem('next_path');
                    window.location.href = nextPath;
                } else {
                    window.location.href = '/accounts/dashboard/';
                }
            }, 1000);
            return;
        }
        
        // Always try to get the user session, even if there are URL errors
        if (messageEl) {
            messageEl.textContent = 'Processing authentication...';
            messageEl.style.color = '#A15DF8';
        }
        
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error || !data || !data.session) {
            throw new Error('Authentication failed. Please try again.');
        }
        
        // We have a session, register the user with our backend
        if (messageEl) {
            messageEl.textContent = 'Authentication successful! Processing...';
            messageEl.style.color = '#A15DF8';
        }
        
        // Process the authenticated user with our backend
        try {
            const userMetadata = data.session.user.user_metadata || {};
            const userData = {
                user_id: data.session.user.id,
                email: data.session.user.email,
                auth_provider: data.session.user.app_metadata.provider,
                name: userMetadata.full_name || userMetadata.name || null,
                avatar_url: userMetadata.avatar_url || null
            };
            
            // Call backend to register the user
            const registerResponse = await fetch('/accounts/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            if (!registerResponse.ok) {
                // Parse the error response if possible
                let errorMessage = 'Failed to register with backend';
                try {
                    const errorData = await registerResponse.json();
                    if (errorData && errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (e) {
                    // If parsing fails, use the default error message
                }
                throw new Error(errorMessage);
            }
            
            const registerData = await registerResponse.json();
            
            // Save token and user data in localStorage
            localStorage.setItem('mailtune_token', registerData.token);
            
            const userToStore = {
                id: registerData.user.id,
                email: registerData.user.email,
                subscription_tier: registerData.user.subscription_tier || 'FREE',
                emails_transformed: registerData.user.emails_transformed || 0,
                name: userMetadata.full_name || userMetadata.name,
                avatar_url: userMetadata.avatar_url
            };
            
            localStorage.setItem('mailtune_user', JSON.stringify(userToStore));
            
            // Update message
            if (messageEl) {
                messageEl.textContent = 'Registration successful! Redirecting...';
            }
            
            // Determine where to redirect the user
            const nextPath = localStorage.getItem('next_path');
            
            setTimeout(() => {
                if (nextPath) {
                    // Clear stored path and redirect to the requested page
                    localStorage.removeItem('next_path');
                    window.location.href = nextPath;
                } else if (registerData.redirect_url) {
                    // Use redirect URL from backend (based on subscription tier)
                    window.location.href = registerData.redirect_url;
                } else {
                    // Default fallback to dashboard
                    window.location.href = '/accounts/dashboard/';
                }
            }, 1000);
            
        } catch (registerError) {
            console.error('Error registering with backend:', registerError);
            
            // For all errors, show the error message
            if (messageEl) {
                messageEl.textContent = `Registration error: ${registerError.message}`;
                messageEl.style.color = 'red';
            }
            
            // Redirect to signup page after error
            setTimeout(() => {
                window.location.href = "/accounts/signup/";
            }, 3000);
        }
    } catch (error) {
        console.error('Error during authentication callback:', error);
        if (messageEl) {
            messageEl.textContent = 'Error during authentication. Please try again.';
            messageEl.style.color = 'red';
        }
        
        // Redirect back to signup page after a delay
        setTimeout(() => {
            window.location.href = "/accounts/signup/";
        }, 3000);
    }
}); 