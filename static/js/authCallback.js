// authCallback.js - Minimal authentication callback handler
document.addEventListener('DOMContentLoaded', async function() {
    // Get message element
    const messageEl = document.getElementById('auth-message');
    
    // Function to show status messages
    function showStatus(message, isError = false) {
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.style.color = isError ? 'red' : '#A15DF8';
        }
        console.log(message);
    }
    
    // Function to redirect after a delay
    function redirectTo(url, delay = 1000) {
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    }
    
    // Handle authentication callback
    async function handleAuthCallback() {
        try {
            showStatus('Processing authentication...');
            
            // Clear any URL parameters to prevent issues with refresh
            if (window.location.search || window.location.hash) {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState(null, '', cleanUrl);
            }
            
            // Check if already logged in with token in localStorage
            const existingToken = localStorage.getItem('mailtune_token');
            const existingUser = localStorage.getItem('mailtune_user');
            
            if (existingToken && existingUser) {
                showStatus('Already logged in! Redirecting...');
                const nextPath = localStorage.getItem('next_path');
                if (nextPath) {
                    localStorage.removeItem('next_path');
                    redirectTo(nextPath);
                } else {
                    redirectTo('/accounts/dashboard/');
                }
                return;
            }
            
            // Load Supabase configuration
            showStatus('Loading configuration...');
            
            const configResponse = await fetch('/accounts/supabase-config/');
            if (!configResponse.ok) {
                throw new Error('Failed to load authentication settings');
            }
            
            const config = await configResponse.json();
            const supabaseClient = window.supabase.createClient(config.url, config.key);
            
            // Check if we have a session
            showStatus('Verifying your identity...');
            
            const { data, error } = await supabaseClient.auth.getSession();
            
            if (error || !data || !data.session) {
                throw new Error('No valid authentication session found');
            }
            
            // Got a valid session, register with backend
            showStatus('Setting up your account...');
            
            const user = data.session.user;
            const userMetadata = user.user_metadata || {};
            
            const userData = {
                user_id: user.id,
                email: user.email,
                auth_provider: user.app_metadata.provider,
                name: userMetadata.full_name || userMetadata.name || null,
                avatar_url: userMetadata.avatar_url || null
            };
            
            // Register with backend
            const registerResponse = await fetch('/accounts/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });
            
            if (!registerResponse.ok) {
                throw new Error('Failed to register with Mail Tune. Please try again.');
            }
            
            const registerData = await registerResponse.json();
            
            // Success! Store the token and user info
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
            
            // All done! Redirect to the appropriate page
            showStatus('Success! Redirecting to your dashboard...');
            
            const nextPath = localStorage.getItem('next_path');
            if (nextPath) {
                localStorage.removeItem('next_path');
                redirectTo(nextPath);
            } else if (registerData.redirect_url) {
                redirectTo(registerData.redirect_url);
            } else {
                redirectTo('/accounts/dashboard/');
            }
            
        } catch (error) {
            console.error('Authentication error:', error);
            showStatus(`Authentication failed: ${error.message}`, true);
            
            // Redirect to sign-in page after a delay
            redirectTo('/accounts/signin/', 3000);
        }
    }
    
    // Start the authentication handling process
    handleAuthCallback();
}); 