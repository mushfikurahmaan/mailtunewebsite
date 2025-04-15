// Check for incorrect URL patterns and fix them
(function() {
    // Check if current URL contains a template tag that wasn't processed
    if (window.location.href.includes('%7B%25') || window.location.href.includes('{%')) {
        // Extract any plan parameter
        const urlParams = new URLSearchParams(window.location.search);
        const plan = urlParams.get('plan');
        
        // Redirect to the correct URL
        let correctUrl = '/accounts/checkout/';
        if (plan) {
            correctUrl += `?plan=${plan}`;
        }
        
        window.location.href = correctUrl;
    }
})();

// Function to load and display user data from localStorage
document.addEventListener('DOMContentLoaded', function() {
    let userData = null;
    
    try {
        const userDataString = localStorage.getItem('mailtune_user');
        userData = userDataString ? JSON.parse(userDataString) : null;
        
        // Check if userData is valid
        if (userData && typeof userData === 'object') {
            // Ensure subscription_tier is set and valid
            const validTiers = ['FREE', 'STARTER', 'PREMIUM', 'BUSINESS'];
            
            // Default to FREE tier if tier is invalid
            if (!userData.subscription_tier || !validTiers.includes(userData.subscription_tier)) {
                userData.subscription_tier = 'FREE';
                localStorage.setItem('mailtune_user', JSON.stringify(userData));
            }
        } else {
            userData = null;
        }
    } catch (e) {
        userData = null;
        localStorage.removeItem('mailtune_user');
    }
    
    if (userData) {
        // Update user name in header
        const nameElement = document.getElementById('user-greeting');
        if (nameElement) {
            const userName = userData.email.split('@')[0]; 
            nameElement.textContent = `Hey, ${userData.name || userName}!`;
        }
        
        // Update email address in account settings
        const emailElement = document.getElementById('user-email');
        if (emailElement) {
            emailElement.textContent = userData.email;
        }
        
        // Update full name in account settings
        const fullNameElement = document.getElementById('user-fullname');
        if (fullNameElement) {
            fullNameElement.textContent = userData.name || userData.email.split('@')[0];
        }
        
        // Update profile picture if available
        const profilePicElement = document.getElementById('profile-pic');
        if (profilePicElement) {
            if (userData.avatar_url) {
                profilePicElement.src = userData.avatar_url;
            } else {
                const initials = userData.name || userData.email.split('@')[0];
                profilePicElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=A15DF8&color=fff`;
            }
        }

        // Pre-populate the dashboard with tier limit information
        prePopulateDashboard(userData.subscription_tier);

        // Fetch current usage data from the server
        fetchUserUsageData();

        // Update the upgrade button based on current subscription
        updateUpgradeButton(userData.subscription_tier);
    } else {
        // No user data - default to FREE tier
        prePopulateDashboard('FREE');
    }
    
    // Add logout functionality
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            localStorage.removeItem('mailtune_token');
            localStorage.removeItem('mailtune_user');
            window.location.href = '/';
        });
    }
});

/**
 * Pre-populate the dashboard with tier limit information
 */
function prePopulateDashboard(tier) {
    // Set subscription tier display
    const subscriptionElement = document.getElementById('current-subscription');
    if (subscriptionElement) {
        subscriptionElement.textContent = getPlanDisplayName(tier);
    }

    // Set plan info in sidebar
    const planInfoElement = document.getElementById('plan-info');
    if (planInfoElement) {
        const planDisplayName = getPlanDisplayName(tier);
        const planPrice = getPlanPrice(tier);
        
        // Update the plan name
        const planNameElement = document.querySelector('#plan-info .font-medium');
        if (planNameElement) {
            planNameElement.textContent = planDisplayName;
        }
        
        // Update the price text
        const planPriceElement = document.querySelector('#plan-info .text-sm.text-gray-300');
        if (planPriceElement) {
            planPriceElement.textContent = planPrice;
        }
    }

    // Update usage limits text based on tier
    updateUsageLimitsText(tier);
    
    // Update renewal date text for free tier
    if (tier === 'FREE') {
        const renewalDateElement = document.getElementById('renewal-date');
        if (renewalDateElement) {
            renewalDateElement.textContent = 'No renewal needed (Free plan)';
        }
        
        const nextBillingElement = document.getElementById('next-billing-date');
        if (nextBillingElement) {
            nextBillingElement.textContent = 'Never (Free plan)';
        }
    }
    
    // Update the upgrade button
    updateUpgradeButton(tier);
}

/**
 * Fetch current usage data from the server
 */
async function fetchUserUsageData() {
    try {
        const token = localStorage.getItem('mailtune_token');
        if (!token) return;

        const response = await fetch('/api/user/usage/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch usage data');
        }

        const data = await response.json();
        
        // Force FREE tier if we received something else
        if (data.subscription_tier !== 'FREE') {
            data.subscription_tier = 'FREE';
        }
        
        updateDashboardWithUsageData(data);
    } catch (error) {
        // Silently fail
    }
}

/**
 * Update the dashboard UI with usage data
 */
function updateDashboardWithUsageData(data) {
    // Update total emails counter
    const totalEmailsElement = document.getElementById('total-emails');
    if (totalEmailsElement) {
        totalEmailsElement.textContent = data.total_emails_transformed;
    }

    // Update words count
    const wordsUsedElement = document.getElementById('words-used');
    if (wordsUsedElement) {
        wordsUsedElement.textContent = data.total_words_transformed;
    }

    // Update subscription tier
    const subscriptionElement = document.getElementById('current-subscription');
    if (subscriptionElement) {
        subscriptionElement.textContent = getPlanDisplayName(data.subscription_tier);
    }

    // Update usage progress bars
    updateProgressBar('words-progress', data.total_words_transformed, data.words_limit);
    updateProgressBar('emails-progress', data.total_emails_transformed, data.email_limit);

    // Update the counters
    const wordsCounterElement = document.getElementById('words-counter');
    if (wordsCounterElement) {
        wordsCounterElement.textContent = `${data.total_words_transformed} / ${data.words_limit}`;
    }
    
    const emailsCounterElement = document.getElementById('emails-counter');
    if (emailsCounterElement) {
        emailsCounterElement.textContent = `${data.total_emails_transformed} / ${data.email_limit}`;
    }
    
    // Update the limit labels
    updateUsageLimitsText(data.subscription_tier);
    
    // Update recent activity if provided
    if (data.recent_activity && Array.isArray(data.recent_activity)) {
        updateRecentActivity(data.recent_activity);
    }
    
    // Update renewal date for paid plans
    if (data.subscription_tier !== 'FREE' && data.next_renewal_date) {
        const renewalDateElement = document.getElementById('renewal-date');
        if (renewalDateElement) {
            const daysUntilRenewal = Math.ceil((new Date(data.next_renewal_date) - new Date()) / (1000 * 60 * 60 * 24));
            renewalDateElement.textContent = `Renews in ${daysUntilRenewal} days`;
        }
        
        const nextBillingElement = document.getElementById('next-billing-date');
        if (nextBillingElement) {
            // Format the date in a human-readable format
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = new Date(data.next_renewal_date).toLocaleDateString(undefined, options);
            nextBillingElement.textContent = formattedDate;
        }
    }
}

/**
 * Update usage limits text based on tier
 */
function updateUsageLimitsText(tier) {
    const limits = getTierLimits(tier);
    
    // Update the limit labels
    document.querySelectorAll('.words-limit-label').forEach(element => {
        element.textContent = limits.words === Infinity ? 
            'Unlimited words' : 
            `Monthly limit of ${limits.words.toLocaleString()} words`;
    });
    
    document.querySelectorAll('.emails-limit-label').forEach(element => {
        element.textContent = limits.emails === Infinity ? 
            'Unlimited emails' : 
            `Monthly limit of ${limits.emails.toLocaleString()} emails`;
    });
}

/**
 * Get tier limits based on tier name
 */
function getTierLimits(tier) {
    const limits = {
        'FREE': { emails: 10, words: 1000 },
        'STARTER': { emails: 100, words: 10000 },
        'PREMIUM': { emails: 500, words: 50000 },
        'BUSINESS': { emails: 1500, words: 600000 }
    };
    
    return limits[tier] || limits['FREE'];
}

/**
 * Update progress bar width based on usage percentage
 */
function updateProgressBar(elementId, current, total) {
    const progressBar = document.getElementById(elementId);
    if (!progressBar) return;
    
    const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
    progressBar.style.width = `${percentage}%`;
}

/**
 * Get user-friendly plan name from tier code
 */
function getPlanDisplayName(tier) {
    const names = {
        'FREE': 'Free',
        'STARTER': 'Starter',
        'PREMIUM': 'Premium',
        'BUSINESS': 'Business'
    };
    
    return names[tier] || 'Free';
}

/**
 * Get pricing text for plan
 */
function getPlanPrice(tier) {
    const prices = {
        'FREE': 'Free forever',
        'STARTER': '$9 billed monthly',
        'PREMIUM': '$19 billed monthly',
        'BUSINESS': '$49 billed monthly'
    };
    
    return prices[tier] || 'Free forever';
}

/**
 * Update the upgrade button based on current tier
 */
function updateUpgradeButton(currentTier) {
    const upgradeButton = document.getElementById('upgrade-button');
    if (!upgradeButton) return;
    
    const nextTier = {
        'FREE': 'STARTER',
        'STARTER': 'PREMIUM',
        'PREMIUM': 'BUSINESS',
        'BUSINESS': 'BUSINESS'
    };
    
    const buttonText = {
        'FREE': 'Upgrade to Starter',
        'STARTER': 'Upgrade to Premium',
        'PREMIUM': 'Upgrade to Business',
        'BUSINESS': 'Manage Plan'
    };
    
    // Set the text of the button
    upgradeButton.textContent = buttonText[currentTier] || 'Upgrade Plan';
    
    // For business tier, change the button to "Manage Plan"
    if (currentTier === 'BUSINESS') {
        upgradeButton.href = '/accounts/manage/';
    } else {
        upgradeButton.href = `/accounts/checkout/?plan=${nextTier[currentTier] || 'STARTER'}`;
    }
}

/**
 * Update recent activity list
 */
function updateRecentActivity(activities) {
    const container = document.getElementById('recent-activity-container');
    if (!container) return;
    
    // Clear current content
    container.innerHTML = '';
    
    // If no activities, show a message
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 text-sm py-4">No recent activity</div>';
        return;
    }
    
    // Add activity items
    activities.forEach(activity => {
        const date = new Date(activity.timestamp);
        const timeAgo = getTimeAgo(date);
        
        const item = document.createElement('div');
        item.className = 'flex items-start';
        item.innerHTML = `
            <div class="p-1.5 rounded-full bg-primary bg-opacity-20 mr-3">
                <svg class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <span class="text-sm font-medium">${getTitleForTone(activity.tone)}</span>
                    <span class="text-xs text-gray-400">${timeAgo}</span>
                </div>
                <p class="text-xs text-gray-400">${activity.word_count} words</p>
            </div>
        `;
        
        container.appendChild(item);
    });
}

/**
 * Get a title for a given tone
 */
function getTitleForTone(tone) {
    const titles = {
        'friendly': 'Friendly Email',
        'professional': 'Professional Email',
        'persuasive': 'Persuasive Email',
        'concise': 'Concise Email',
        'formal': 'Formal Email',
        'enthusiastic': 'Enthusiastic Email',
        'assertive': 'Assertive Email',
        'respectful': 'Respectful Email'
    };
    
    return titles[tone] || 'Email Transformation';
}

/**
 * Get time ago text from date
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }
    
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }
    
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }
    
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }
    
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }
    
    return 'Just now';
} 