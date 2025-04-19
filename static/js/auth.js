// Save ?next from the URL to localStorage so we can redirect after login
const urlParams = new URLSearchParams(window.location.search);
const next = urlParams.get('next');
if (next) {
    localStorage.setItem('next_path', next);
}

// Initialize Supabase client - will be properly initialized after fetching config
let supabaseClient;
let domainConfig;

// Fetch Supabase configuration from the server
async function initializeSupabase() {
    const messageEl = document.getElementById('auth-message');
    
    try {
        // If an auth error happened previously, clear it from localStorage
        localStorage.removeItem('auth_error');
        
        // Show loading message
        if (messageEl) {
            messageEl.textContent = 'Initializing...';
            messageEl.classList.remove('hidden');
            messageEl.style.color = '#A15DF8';
        }
        
        // Get the Supabase configuration
        const response = await fetch('/accounts/supabase-config/');
        if (!response.ok) {
            throw new Error('Failed to load authentication configuration');
        }
        
        const config = await response.json();
        supabaseClient = window.supabase.createClient(config.url, config.key);
        
        // Get domain configuration
        const domainResponse = await fetch('/accounts/domain-config/');
        if (domainResponse.ok) {
            domainConfig = await domainResponse.json();
        }
        
        // If we're on the auth-callback page, hide loading message
        if (window.location.pathname.includes('/auth-callback/')) {
            // The callback page has its own logic
            return;
        }
        
        // If message element exists, show ready message briefly then hide it
        if (messageEl) {
            messageEl.textContent = 'Ready';
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, 500);
        }
    } catch (error) {
        console.error('Error initializing authentication:', error);
        if (messageEl) {
            messageEl.textContent = 'Error loading authentication service. Please refresh the page.';
            messageEl.classList.remove('hidden');
            messageEl.style.color = 'red';
        }
    }
}

// Function to handle signup with different providers
async function signupWithProvider(provider) {
    const messageEl = document.getElementById('auth-message');
    
    try {
        // Ensure Supabase is initialized
        if (!supabaseClient) {
            await initializeSupabase();
        }
        
        // Show loading message
        if (messageEl) {
            messageEl.textContent = `Signing up with ${provider}...`;
            messageEl.classList.remove('hidden');
            messageEl.style.color = '#A15DF8';
        }
        
        // Save email for potential error recovery
        const emailInput = document.getElementById('email');
        if (emailInput && emailInput.value) {
            localStorage.setItem('signup_email', emailInput.value);
        }
        
        // Determine the callback URL
        let redirectUrl;
        if (domainConfig && domainConfig.auth_callback_url) {
            redirectUrl = domainConfig.auth_callback_url;
        } else {
            const currentDomain = window.location.origin;
            redirectUrl = `${currentDomain}/accounts/auth-callback/`;
        }
        
        // Attempt to sign in with OAuth
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) {
            throw error;
        }
        
        // User will be redirected to provider's auth page
    } catch (error) {
        console.error(`Error signing up with ${provider}:`, error);
        localStorage.setItem('auth_error', error.message);
        
        if (messageEl) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.classList.remove('hidden');
            messageEl.style.color = 'red';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    initializeSupabase();
}); 