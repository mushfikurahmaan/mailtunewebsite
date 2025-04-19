// This script handles the auth callback page
document.addEventListener('DOMContentLoaded', async function() {
    // Get the Supabase configuration from the server
    let supabaseClient;
    const messageEl = document.getElementById('auth-message');
    
    try {
        // Check for error parameters in the URL query string
        const urlParams = new URLSearchParams(window.location.search);
        const urlError = urlParams.get('error');
        const urlErrorDescription = urlParams.get('error_description');
        
        // Also check the URL hash fragment (Supabase sometimes puts errors there)
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const hashError = hashParams.get('error');
        const hashErrorDescription = hashParams.get('error_description');
        
        // Use either URL query params or hash fragment params, with URL taking precedence
        const authError = urlError || hashError;
        const authErrorDesc = urlErrorDescription || hashErrorDescription;
        
        // Special handling for database errors when saving a new user
        // This means the user already exists in Supabase but might not be in our backend
        if (authError && authErrorDesc && authErrorDesc.includes('Database error saving new user')) {
            if (messageEl) {
                messageEl.textContent = 'Processing your authentication...';
                messageEl.style.color = '#A15DF8';
            }
            
            // Try to get a session from Supabase - the user might exist already
            try {
                // Initialize the Supabase client
                const response = await fetch('/accounts/supabase-config/');
                if (!response.ok) {
                    throw new Error('Failed to load Supabase configuration');
                }
                
                const config = await response.json();
                supabaseClient = window.supabase.createClient(config.url, config.key);
                
                // Try to sign in the user with the Supabase client
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: localStorage.getItem('signup_email') || '',
                    password: localStorage.getItem('signup_password') || ''
                });
                
                if (error) {
                    // If password auth fails, try session recovery
                    const sessionResult = await supabaseClient.auth.getSession();
                    if (sessionResult.error || !sessionResult.data.session) {
                        throw new Error('Could not recover authentication session');
                    }
                    
                    // We have a session, continue with registration
                    const userMetadata = sessionResult.data.session.user.user_metadata || {};
                    const userData = {
                        user_id: sessionResult.data.session.user.id,
                        email: sessionResult.data.session.user.email,
                        auth_provider: sessionResult.data.session.user.app_metadata.provider,
                        name: userMetadata.full_name || userMetadata.name || null,
                        avatar_url: userMetadata.avatar_url || null
                    };
                    
                    // Call our backend to register the user
                    if (messageEl) {
                        messageEl.textContent = 'Syncing with our system...';
                    }
                    
                    const registerResponse = await fetch('/accounts/register/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(userData)
                    });
                    
                    if (!registerResponse.ok) {
                        throw new Error('Failed to register user in backend');
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
                        messageEl.textContent = 'Account setup successful! Redirecting...';
                    }
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = registerData.redirect_url || '/accounts/dashboard/';
                    }, 1000);
                    
                    return;
                }
            } catch (recoveryError) {
                console.error('Recovery attempt failed:', recoveryError);
                // Fallback to signin page
                if (messageEl) {
                    messageEl.textContent = 'Please sign in with your existing account';
                    messageEl.style.color = 'red';
                }
                
                setTimeout(() => {
                    window.location.href = '/accounts/signin/';
                }, 2000);
                return;
            }
        } else if (authError) {
            // Handle other auth errors
            console.error('Auth error from provider:', authError, authErrorDesc);
            
            // Show user-friendly error message
            if (messageEl) {
                let userMessage = 'Error during authentication.';
                
                if (authError === 'server_error') {
                    userMessage = 'Server error during authentication. Please try again later.';
                }
                
                messageEl.textContent = userMessage;
                messageEl.style.color = 'red';
            }
            
            // Redirect to login page with shorter timeout
            setTimeout(() => {
                window.location.href = "/accounts/signin/";
            }, 2000);
            
            return; // Stop processing
        }
        
        // If no errors in URL, continue with normal flow...
        
        // Fetch configuration from the server (if not already fetched)
        if (!supabaseClient) {
            const response = await fetch('/accounts/supabase-config/');
            if (!response.ok) {
                throw new Error('Failed to load Supabase configuration');
            }
            
            const config = await response.json();
            supabaseClient = window.supabase.createClient(config.url, config.key);
        }
        
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
        
        // Get the session from URL hash parameters
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            throw error;
        }
        
        if (data && data.session) {
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
                
                // Check if this is a duplicate email error - this means the user exists
                if (registerError.message && registerError.message.includes('duplicate key value') && 
                    registerError.message.includes('email')) {
                    
                    // This is an existing user, so we should log them in
                    if (messageEl) {
                        messageEl.textContent = 'Welcome back! Redirecting to dashboard...';
                        messageEl.style.color = '#A15DF8'; // Use success color
                    }
                    
                    // Create a basic user object with the available data
                    const userToStore = {
                        id: userData.user_id,
                        email: userData.email,
                        subscription_tier: 'FREE', // Default to FREE until we get more info
                        name: userMetadata.full_name || userMetadata.name,
                        avatar_url: userMetadata.avatar_url
                    };
                    
                    // Save minimal user data to localStorage
                    localStorage.setItem('mailtune_user', JSON.stringify(userToStore));
                    
                    // Generate a simple client-side token (this will be replaced on first API call)
                    localStorage.setItem('mailtune_token', btoa(userData.email + ':' + new Date().getTime()));
                    
                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                        window.location.href = '/accounts/dashboard/';
                    }, 1000);
                    return;
                }
                
                // For all other errors, show the error message
                if (messageEl) {
                    messageEl.textContent = `Registration error: ${registerError.message}`;
                    messageEl.style.color = 'red';
                }
                
                // Redirect to signup page after error
                setTimeout(() => {
                    window.location.href = "/accounts/signup/";
                }, 3000);
            }
        } else {
            if (messageEl) {
                messageEl.textContent = 'No authentication session found. Please try again.';
                messageEl.style.color = 'red';
            }
            
            // Redirect back to signup page after a delay
            setTimeout(() => {
                window.location.href = "/accounts/signup/";
            }, 3000);
        }
    } catch (error) {
        console.error('Error during authentication callback:', error);
        if (messageEl) {
            messageEl.textContent = 'Error during authentication. Redirecting back...';
            messageEl.style.color = 'red';
        }
        
        // Redirect back to signup page after a delay
        setTimeout(() => {
            window.location.href = "/accounts/signup/";
        }, 3000);
    }
}); 