// Initialize Supabase client
const supabaseUrl = 'https://mblbjlnakohvcwbxnghu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibGJqbG5ha29odmN3YnhuZ2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1OTg5OTgsImV4cCI6MjA2MDE3NDk5OH0.P9AYR9nr5dA7NPJscGliPT4Ygs69AAHVNrB1a4R2dOw';
// Use the global Supabase client provided by the HTML page
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

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
        if (data.user.subscription_tier === 'FREE') {
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
        // Make sure the auth-message element is visible
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = `Signing up with ${provider}...`;
            messageEl.classList.remove('hidden');
            messageEl.style.color = '#A15DF8'; // Set text color to primary color
        }
        
        // Sign up with the selected provider
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin + '/accounts/auth-callback/'
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
document.addEventListener('DOMContentLoaded', async () => {
    // Get the current page path
    const currentPath = window.location.pathname;
    
    // Only proceed with auth check if on the auth-callback page
    // This prevents automatic redirection on sign-in/sign-up pages
    if (currentPath.includes('/auth-callback/')) {
        try {
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
}); 