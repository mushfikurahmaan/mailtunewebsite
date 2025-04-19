// auth.js - Minimal authentication handler
document.addEventListener('DOMContentLoaded', () => {
    // Store next path from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const next = urlParams.get('next');
    if (next) {
        localStorage.setItem('next_path', next);
    }
    
    // Initialize message element
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.classList.remove('hidden');
    }
    
    // Function to show status messages
    function showStatus(message, isError = false) {
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.style.color = isError ? 'red' : '#A15DF8';
        }
        console.log(message);
    }
    
    // Load Supabase configuration
    loadSupabaseConfig();
    
    // Set up authentication provider buttons
    setupAuthButtons();
    
    async function loadSupabaseConfig() {
        try {
            showStatus('Loading authentication...');
            
            const response = await fetch('/accounts/supabase-config/');
            if (!response.ok) {
                throw new Error('Failed to load authentication settings');
            }
            
            const config = await response.json();
            window.supabaseClient = supabase.createClient(config.url, config.key);
            
            showStatus('Authentication ready');
            setTimeout(() => {
                if (messageEl) messageEl.classList.add('hidden');
            }, 1000);
        } catch (error) {
            console.error('Failed to initialize authentication:', error);
            showStatus('Authentication setup failed. Please refresh the page.', true);
        }
    }
    
    function setupAuthButtons() {
        // Set up Google auth button
        const googleBtn = document.querySelector('[onclick="signupWithProvider(\'google\')"]');
        if (googleBtn) {
            googleBtn.removeAttribute('onclick');
            googleBtn.addEventListener('click', () => handleAuth('google'));
        }
        
        // Set up Facebook auth button
        const facebookBtn = document.querySelector('[onclick="signupWithProvider(\'facebook\')"]');
        if (facebookBtn) {
            facebookBtn.removeAttribute('onclick');
            facebookBtn.addEventListener('click', () => handleAuth('facebook'));
        }
        
        // Set up Twitter/X auth button
        const twitterBtn = document.querySelector('[onclick="signupWithProvider(\'twitter\')"]');
        if (twitterBtn) {
            twitterBtn.removeAttribute('onclick');
            twitterBtn.addEventListener('click', () => handleAuth('twitter'));
        }
    }
    
    async function handleAuth(provider) {
        try {
            showStatus(`Signing in with ${provider}...`);
            
            if (!window.supabaseClient) {
                throw new Error('Authentication service not initialized');
            }
            
            // Store the current time so we can track redirects
            localStorage.setItem('auth_start_time', Date.now().toString());
            
            // Store the email if available in a form
            const emailInput = document.getElementById('email');
            if (emailInput && emailInput.value) {
                localStorage.setItem('auth_email', emailInput.value);
            }
            
            // Calculate the callback URL
            const callbackUrl = `${window.location.origin}/accounts/auth-callback/`;
            
            // Clear any previous errors
            localStorage.removeItem('auth_error');
            
            // Initiate OAuth login
            const { error } = await window.supabaseClient.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: callbackUrl
                }
            });

            if (error) throw error;
            
            // At this point, the browser will redirect to the provider's login page
        } catch (error) {
            console.error(`Authentication error with ${provider}:`, error);
            localStorage.setItem('auth_error', error.message);
            showStatus(`Authentication error: ${error.message}`, true);
        }
    }
}); 