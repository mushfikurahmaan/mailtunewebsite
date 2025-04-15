/**
 * Subscription management JavaScript
 */
document.addEventListener('DOMContentLoaded', function() {
    // Handle profile image
    loadProfileImage();
    
    // Load subscription data
    loadSubscriptionData();
    
    // Set up event listeners
    const cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
        cancelButton.addEventListener('click', showCancelConfirmation);
    }
    
    const closeModalButton = document.querySelector('#cancelModal button:first-of-type');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideCancelConfirmation);
    }
    
    const confirmCancelButton = document.querySelector('#cancelModal button:last-of-type');
    if (confirmCancelButton) {
        confirmCancelButton.addEventListener('click', cancelSubscription);
    }
});

/**
 * Load profile image from localStorage
 */
function loadProfileImage() {
    const profilePicElement = document.getElementById('profile-pic');
    if (!profilePicElement) return;
    
    try {
        const userDataString = localStorage.getItem('mailtune_user');
        const userData = userDataString ? JSON.parse(userDataString) : null;
        
        if (userData && userData.avatar_url) {
            profilePicElement.src = userData.avatar_url;
        } else if (userData && userData.email) {
            const initials = userData.name || userData.email.split('@')[0];
            profilePicElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=A15DF8&color=fff`;
        }
    } catch (e) {
        // Silently fail and keep the default avatar
    }
}

/**
 * Load subscription data from API
 */
async function loadSubscriptionData() {
    try {
        const token = localStorage.getItem('mailtune_token');
        if (!token) {
            window.location.href = '/accounts/signin/';
            return;
        }
        
        // Fetch subscription data
        const response = await fetch('/api/get-usage-stats/', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load subscription data');
        }
        
        const data = await response.json();
        updateSubscriptionUI(data);
    } catch (error) {
        console.error('Error loading subscription data:', error);
        document.getElementById('errorMessage').textContent = 'Failed to load subscription details';
        document.getElementById('errorMessage').classList.remove('hidden');
    }
}

/**
 * Update UI with subscription data
 */
function updateSubscriptionUI(data) {
    // Update subscription status badge
    const statusBadge = document.getElementById('subscriptionStatus');
    if (statusBadge) {
        if (data.is_active) {
            statusBadge.textContent = 'Active';
            statusBadge.classList.add('bg-green-500');
        } else {
            statusBadge.textContent = 'Canceled';
            statusBadge.classList.remove('bg-green-500');
            statusBadge.classList.add('bg-red-500');
            
            // Hide cancel button, show resubscribe option
            document.getElementById('cancelButton').classList.add('hidden');
            document.getElementById('resubscribeSection').classList.remove('hidden');
        }
    }
    
    // Update plan information
    document.querySelector('[data-subscription-plan]').textContent = getPlanDisplayName(data.subscription_tier);
    
    // Update cost information based on tier
    const costElement = document.querySelector('[data-subscription-cost]');
    if (costElement) {
        costElement.textContent = getPlanPrice(data.subscription_tier);
    }
    
    // Update subscription ID if available
    if (data.subscription_id) {
        document.querySelector('[data-subscription-id]').textContent = data.subscription_id;
    }
    
    // Load billing history
    loadBillingHistory();
}

/**
 * Show cancellation confirmation modal
 */
function showCancelConfirmation() {
    document.getElementById('cancelModal').classList.remove('hidden');
}

/**
 * Hide cancellation confirmation modal
 */
function hideCancelConfirmation() {
    document.getElementById('cancelModal').classList.add('hidden');
}

/**
 * Cancel subscription
 */
async function cancelSubscription() {
    try {
        const token = localStorage.getItem('mailtune_token');
        if (!token) {
            window.location.href = '/accounts/signin/';
            return;
        }
        
        // Make API request to cancel subscription
        const response = await fetch('/api/cancel-subscription/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update UI
            document.getElementById('subscriptionStatus').textContent = 'Canceled';
            document.getElementById('subscriptionStatus').classList.remove('bg-green-500');
            document.getElementById('subscriptionStatus').classList.add('bg-red-500');
            
            // Show success message
            document.getElementById('successMessage').textContent = 
                `Your subscription has been canceled. You will have access until ${data.end_date}.`;
            document.getElementById('successMessage').classList.remove('hidden');
            
            // Hide modal
            document.getElementById('cancelModal').classList.add('hidden');
            
            // Hide cancel button, show resubscribe option
            document.getElementById('cancelButton').classList.add('hidden');
            document.getElementById('resubscribeSection').classList.remove('hidden');
            
            // Update user data in localStorage
            const userDataString = localStorage.getItem('mailtune_user');
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                userData.subscription_status = 'canceled';
                localStorage.setItem('mailtune_user', JSON.stringify(userData));
            }
        } else {
            // Show error message
            document.getElementById('errorMessage').textContent = data.error || 'Failed to cancel subscription';
            document.getElementById('errorMessage').classList.remove('hidden');
            document.getElementById('cancelModal').classList.add('hidden');
        }
    } catch (error) {
        console.error('Error canceling subscription:', error);
        document.getElementById('errorMessage').textContent = 'An error occurred while canceling your subscription';
        document.getElementById('errorMessage').classList.remove('hidden');
        document.getElementById('cancelModal').classList.add('hidden');
    }
}

/**
 * Load billing history
 */
async function loadBillingHistory() {
    // This would typically fetch billing history from an API
    // For now, we'll use the static data in the HTML
}

/**
 * Get plan display name
 */
function getPlanDisplayName(tier) {
    const displayNames = {
        'FREE': 'Free Plan',
        'STARTER': 'Starter Plan',
        'PREMIUM': 'Premium Plan',
        'BUSINESS': 'Business Plan'
    };
    
    return displayNames[tier] || tier;
}

/**
 * Get plan price
 */
function getPlanPrice(tier) {
    const prices = {
        'FREE': '$0.00',
        'STARTER': '$9.00',
        'PREMIUM': '$19.00',
        'BUSINESS': '$49.00'
    };
    
    return prices[tier] || '$0.00';
} 