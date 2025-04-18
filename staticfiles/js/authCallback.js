// This script handles the auth callback page
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Supabase client
    const supabaseUrl = 'https://mblbjlnakohvcwbxnghu.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibGJqbG5ha29odmN3YnhuZ2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1OTg5OTgsImV4cCI6MjA2MDE3NDk5OH0.P9AYR9nr5dA7NPJscGliPT4Ygs69AAHVNrB1a4R2dOw';
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    const messageEl = document.getElementById('auth-message');
    
    try {
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
            }
            
            // Redirect to the signup page which will handle the authentication
            setTimeout(() => {
                window.location.href = "/accounts/signup_page/";
            }, 1000);
        } else {
            if (messageEl) {
                messageEl.textContent = 'No authentication session found. Please try again.';
            }
            
            // Redirect back to signup page after a delay
            setTimeout(() => {
                window.location.href = "/accounts/signup_page/";
            }, 3000);
        }
    } catch (error) {
        console.error('Error during authentication callback:', error);
        if (messageEl) {
            messageEl.textContent = 'Error during authentication. Redirecting back...';
        }
        
        // Redirect back to signup page after a delay
        setTimeout(() => {
            window.location.href = "/accounts/signup_page/";
        }, 3000);
    }
}); 