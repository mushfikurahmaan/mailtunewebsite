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
    try {
        const response = await fetch('/accounts/supabase-config/');
        if (!response.ok) {
            throw new Error('Failed to load Supabase configuration');
        }
        
        const config = await response.json();
        
        // Initialize the Supabase client with the fetched credentials
        supabaseClient = window.supabase.createClient(config.url, config.key);
        
        // Also fetch domain configuration
        const domainResponse = await fetch('/accounts/domain-config/');
        if (domainResponse.ok) {
            domainConfig = await domainResponse.json();
        }
        
        // If we're on the auth-callback page, check authentication immediately
        if (window.location.pathname.includes('/auth-callback/')) {
            checkAuthentication();
        }
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = 'Error loading authentication. Please try again.';
            messageEl.classList.remove('hidden');
            messageEl.style.color = 'red';
        }
    }
}

// Function to handle successful signup and redirect
async function handleSignupSuccess(user) {
    try {
        // Get additional user metadata if available
        const userMetadata = user.user_metadata || {};
        const userName = userMetadata.full_name || userMetadata.name || null;
        const avatarUrl = userMetadata.avatar_url || null;
        
        // Prepare data for our backend
        const userData = {
            user_id: user.id,
            email: user.email,
            auth_provider: user.app_metadata.provider,
            name: userName,
            avatar_url: avatarUrl
        };

        // Call our backend to register the user and get the redirect URL
        const response = await fetch('/accounts/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error('Failed to register user with backend');
        }

        const data = await response.json();

        // Save the token in localStorage
        localStorage.setItem('mailtune_token', data.token);
        
        // Store user info with additional details from auth provider
        const userToStore = {
            id: data.user.id,
            email: data.user.email,
            subscription_tier: 'FREE', // Always default to FREE for new users
            emails_transformed: data.user.emails_transformed || 0,
            name: userName,
            avatar_url: avatarUrl
        };
        
        // Only update to a non-FREE tier if explicitly set by the backend and valid
        if (data.user.subscription_tier && 
            ['STARTER', 'PREMIUM', 'BUSINESS'].includes(data.user.subscription_tier)) {
            userToStore.subscription_tier = data.user.subscription_tier;
        }
        
        localStorage.setItem('mailtune_user', JSON.stringify(userToStore));
        
        // Show success message
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = 'Sign up successful! Redirecting...';
            messageEl.classList.remove('hidden');
            messageEl.style.color = '#A15DF8'; // Set text color to primary color
        }
        
        // Redirect based on the subscription tier
        const nextPath = localStorage.getItem('next_path');
        if (nextPath) {
            localStorage.removeItem('next_path');
            window.location.href = nextPath;
        } else if (data.user.subscription_tier === 'FREE') {
            window.location.href = '/accounts/dashboard/';
        } else {
            window.location.href = '/accounts/checkout/';
        }
    } catch (error) {
        console.error('Error during signup process:', error);
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.classList.remove('hidden');
            messageEl.style.color = 'red'; // Set error message color to red
        }
    }
}

// Function to handle signup with different providers (Google, Facebook, Twitter/X)
async function signupWithProvider(provider) {
    try {
        if (!supabaseClient) {
            await initializeSupabase();
        }
        
        // Make sure the auth-message element is visible
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = `Signing up with ${provider}...`;
            messageEl.classList.remove('hidden');
            messageEl.style.color = '#A15DF8'; // Set text color to primary color
        }
        
        // Determine the correct redirect URL based on the domain config
        let redirectUrl;
        
        if (domainConfig && domainConfig.auth_callback_url) {
            // Use the domain config from our backend
            redirectUrl = domainConfig.auth_callback_url;
        } else {
            // Fallback to the previous behavior if domain config is not available
            const currentDomain = window.location.origin;
            redirectUrl = `${currentDomain}/accounts/auth-callback/`;
        }
        
        // Sign up with the selected provider
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: redirectUrl
            }
        });

        if (error) throw error;
        
        // The user will be redirected to the provider's authentication page
        // After authentication, they will be redirected back to our site
        
    } catch (error) {
        console.error('Error signing up with provider:', error);
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.classList.remove('hidden');
            messageEl.style.color = 'red'; // Set error message color to red
        }
    }
}

// Check if user is already authenticated when returning from OAuth redirect
async function checkAuthentication() {
    try {
        if (!supabaseClient) {
            await initializeSupabase();
            return; // The init function will call this again after initializing
        }
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            console.log('User is already authenticated:', session.user);
            // Make sure the auth-message element is visible
            const messageEl = document.getElementById('auth-message');
            if (messageEl) {
                messageEl.textContent = 'Successfully authenticated! Processing...';
                messageEl.classList.remove('hidden');
                messageEl.style.color = '#A15DF8'; // Set text color to primary color
            }
            
            handleSignupSuccess(session.user);
        }
    } catch (error) {
        console.error('Error checking authentication status:', error);
    }
}

// Initialize the app when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    initializeSupabase();
    
    // The auth check for callback page is now handled in initializeSupabase
}); 