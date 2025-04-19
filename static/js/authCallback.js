// This script handles the auth callback page
document.addEventListener('DOMContentLoaded', async function() {
    const messageEl = document.getElementById('auth-message');
    
    // Helper function to show status messages
    function showMessage(message, isError = false) {
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.style.color = isError ? 'red' : '#A15DF8';
        }
        console.log(message);
    }
    
    // Helper function to redirect
    function redirectTo(url, delay = 1000) {
        setTimeout(() => {
            window.location.href = url;
        }, delay);
    }
    
    try {
        showMessage('Processing authentication...');
        
        // 1. Clean up any error parameters in the URL to prevent issues on refresh
        if (window.location.search.includes('error=') || window.location.hash.includes('error=')) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState(null, '', cleanUrl);
        }
        
        // 2. Check if already logged in via localStorage
        const token = localStorage.getItem('mailtune_token');
        const userData = localStorage.getItem('mailtune_user');
        
        if (token && userData) {
            showMessage('Already authenticated! Redirecting...');
            const nextPath = localStorage.getItem('next_path');
            
            if (nextPath) {
                localStorage.removeItem('next_path');
                redirectTo(nextPath);
            } else {
                redirectTo('/accounts/dashboard/');
            }
            return;
        }
        
        // 3. Get Supabase config
        const configResponse = await fetch('/accounts/supabase-config/');
        if (!configResponse.ok) {
            throw new Error('Failed to load authentication configuration');
        }
        
        const config = await configResponse.json();
        const supabaseClient = window.supabase.createClient(config.url, config.key);
        
        // 4. Try to get the session directly from Supabase
        showMessage('Checking authentication status...');
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error || !data || !data.session) {
            // No valid session found
            showMessage('Authentication failed. Please try signing in again.', true);
            redirectTo('/accounts/signin/', 2000);
            return;
        }
        
        // 5. We have a session! Process the authenticated user
        showMessage('Authentication successful! Processing...');
        
        // Get user data from session
        const user = data.session.user;
        const userMetadata = user.user_metadata || {};
        
        const backendUserData = {
            user_id: user.id,
            email: user.email,
            auth_provider: user.app_metadata.provider,
            name: userMetadata.full_name || userMetadata.name || null,
            avatar_url: userMetadata.avatar_url || null
        };
        
        // 6. Register with backend
        showMessage('Registering with Mail Tune...');
        const registerResponse = await fetch('/accounts/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendUserData)
        });
        
        if (!registerResponse.ok) {
            throw new Error('Failed to register with Mail Tune');
        }
        
        const registerData = await registerResponse.json();
        
        // 7. Save auth data to localStorage
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
        
        // 8. Redirect to appropriate page
        showMessage('Registration successful! Redirecting...');
        
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
        showMessage(`Authentication error: ${error.message}`, true);
        
        // Redirect to signup page after delay
        redirectTo('/accounts/signup/', 3000);
    }
}); 