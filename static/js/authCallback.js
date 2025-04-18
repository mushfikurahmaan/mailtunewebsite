// This script handles the auth callback page
document.addEventListener('DOMContentLoaded', async function() {
    // Get the Supabase configuration from the server
    let supabaseClient;
    const messageEl = document.getElementById('auth-message');
    
    try {
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
            // Already authenticated, redirect directly to dashboard
            if (messageEl) {
                messageEl.textContent = 'Already authenticated! Redirecting to dashboard...';
                messageEl.style.color = '#A15DF8';
            }
            
            // Short timeout to allow message to be seen
            setTimeout(() => {
                window.location.href = '/accounts/dashboard/';
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
                messageEl.textContent = 'Authentication successful! Redirecting...';
                messageEl.style.color = '#A15DF8';
            }
            
            // Redirect to the signup page which will handle the authentication
            setTimeout(() => {
                window.location.href = "/accounts/signup/";
            }, 1000);
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