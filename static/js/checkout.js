// Functions for handling subscription upgrades

/**
 * Update user subscription tier in database
 */
async function updateSubscription(tier, subscriptionId = null) {
    try {
        const token = localStorage.getItem('mailtune_token');
        if (!token) {
            console.error('No auth token found');
            return false;
        }

        const response = await fetch('/accounts/update_subscription/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription_tier: tier,
                subscription_id: subscriptionId,
                payment_method: 'credit_card' // Could come from form data
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update subscription');
        }

        const data = await response.json();
        
        // Update localStorage with new user data
        updateUserDataInLocalStorage(data.user);
        
        return true;
    } catch (error) {
        console.error('Error updating subscription:', error);
        return false;
    }
}

/**
 * Update user data in localStorage
 */
function updateUserDataInLocalStorage(userData) {
    // Get existing user data
    const userDataString = localStorage.getItem('mailtune_user');
    if (!userDataString) return;
    
    try {
        const existingData = JSON.parse(userDataString);
        
        // Merge new data with existing data, prioritizing new data
        const updatedData = {
            ...existingData,
            ...userData
        };
        
        // Save back to localStorage
        localStorage.setItem('mailtune_user', JSON.stringify(updatedData));
        console.log('Updated user data in localStorage', updatedData);
    } catch (e) {
        console.error('Error updating user data in localStorage:', e);
    }
}

/**
 * Handle successful payment and plan upgrade
 */
function handleSuccessfulPayment(tier, subscriptionId) {
    updateSubscription(tier, subscriptionId).then(success => {
        if (success) {
            // Show success message
            alert(`Successfully upgraded to ${tier} plan!`);
            
            // Redirect to dashboard after successful upgrade
            window.location.href = '/accounts/dashboard/';
        } else {
            alert('There was an issue updating your subscription. Please contact support.');
        }
    });
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load user profile data
    loadUserProfile();
    
    // Get selected plan from URL parameters or default to Premium
    const urlParams = new URLSearchParams(window.location.search);
    let selectedPlan = urlParams.get('plan') || 'PREMIUM';
    
    // Make plan selection work
    const planCards = document.querySelectorAll('.border.rounded-lg');
    
    // Update UI to show which plan is selected
    updatePlanSelection(selectedPlan);
    
    // Add click events to plan cards
    if (planCards.length > 0) {
        planCards.forEach(card => {
            card.addEventListener('click', function() {
                // Extract plan name from the card
                const planName = this.querySelector('.text-lg.font-semibold').textContent.toUpperCase();
                selectedPlan = planName;
                
                // Update UI to show selected plan
                updatePlanSelection(selectedPlan);
                
                // Update order summary
                updateOrderSummary(selectedPlan);
            });
        });
    }
    
    // Get the checkout form element
    const checkoutForm = document.getElementById('checkout-form');
    
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Form validation - checking if required fields are filled
            const requiredFields = document.querySelectorAll('[required]');
            let valid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    valid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
            
            if (!valid) {
                alert('Please fill all required fields');
                return;
            }
            
            // Process payment (this would typically connect to a payment processor like Stripe)
            processPayment(selectedPlan);
        });
    }
    
    // Complete payment button
    const completePaymentButton = document.querySelector('.order-summary button');
    if (completePaymentButton) {
        completePaymentButton.addEventListener('click', function() {
            // Process payment (this would typically connect to a payment processor like Stripe)
            processPayment(selectedPlan);
        });
    }
    
    // Payment method selection
    const paymentMethods = document.querySelectorAll('.payment-method');
    if (paymentMethods.length > 0) {
        paymentMethods.forEach(method => {
            method.addEventListener('change', function() {
                const paymentId = this.value;
                console.log('Selected payment method: ' + paymentId);
                
                // Show/hide relevant payment details based on selection
                document.querySelectorAll('.payment-details').forEach(details => {
                    details.style.display = 'none';
                });
                
                const selectedDetails = document.getElementById('details-' + paymentId);
                if (selectedDetails) {
                    selectedDetails.style.display = 'block';
                }
            });
        });
    }
    
    // Handle address same as shipping checkbox
    const sameAddressCheckbox = document.getElementById('same-as-shipping');
    if (sameAddressCheckbox) {
        sameAddressCheckbox.addEventListener('change', function() {
            const billingFields = document.querySelector('.billing-address-fields');
            if (billingFields) {
                billingFields.style.display = this.checked ? 'none' : 'block';
            }
        });
    }
    
    // Update order summary initially
    updateOrderSummary(selectedPlan);
});

/**
 * Update UI to show which plan is selected
 */
function updatePlanSelection(planName) {
    // Remove highlights from all cards
    const planCards = document.querySelectorAll('.border.rounded-lg');
    
    planCards.forEach(card => {
        // Reset styles
        card.classList.remove('border-primary', 'bg-primary', 'bg-opacity-5');
        card.classList.add('border-gray-800');
        
        // Remove "Current Plan" label if it exists
        const label = card.querySelector('.absolute');
        if (label) {
            label.remove();
        }
        
        // Reset buttons
        const button = card.querySelector('button');
        if (button) {
            button.textContent = 'Select Plan';
            button.classList.remove('bg-primary', 'text-white');
            button.classList.add('border', 'border-primary', 'text-primary');
        }
    });
    
    // Find matching card
    planCards.forEach(card => {
        const cardPlanName = card.querySelector('.text-lg.font-semibold').textContent.toUpperCase();
        
        if (cardPlanName === planName) {
            // Highlight selected card
            card.classList.remove('border-gray-800');
            card.classList.add('border-primary', 'bg-primary', 'bg-opacity-5');
            
            // Add selected label
            if (!card.querySelector('.absolute')) {
                const label = document.createElement('div');
                label.className = 'absolute -top-3 right-3 bg-primary text-xs text-white px-2 py-0.5 rounded-full';
                label.textContent = 'Selected Plan';
                card.prepend(label);
            }
            
            // Update button
            const button = card.querySelector('button');
            if (button) {
                button.textContent = 'Selected';
                button.classList.remove('border', 'border-primary', 'text-primary');
                button.classList.add('bg-primary', 'text-white');
            }
        }
    });
}

/**
 * Update order summary based on selected plan
 */
function updateOrderSummary(planName) {
    // Get plan prices
    const planPrices = {
        'STARTER': 9,
        'PREMIUM': 19,
        'BUSINESS': 49
    };
    
    const price = planPrices[planName] || 19; // Default to Premium price if plan not found
    const tax = Math.round(price * 0.08 * 100) / 100; // 8% tax rate
    const total = price + tax;
    
    // Update order summary
    const summaryContainer = document.querySelector('.bg-gray-900.rounded-lg');
    if (summaryContainer) {
        // Update plan name and price
        const items = summaryContainer.querySelectorAll('.flex.justify-between');
        if (items.length >= 1) {
            items[0].innerHTML = `
                <span class="text-gray-400">${planName.charAt(0) + planName.slice(1).toLowerCase()} Plan (Monthly)</span>
                <span>$${price.toFixed(2)}</span>
            `;
        }
        
        // Update tax
        if (items.length >= 2) {
            items[1].innerHTML = `
                <span class="text-gray-400">Taxes</span>
                <span>$${tax.toFixed(2)}</span>
            `;
        }
        
        // Update total
        const totalElement = summaryContainer.querySelector('.border-t.border-gray-800 .flex.justify-between');
        if (totalElement) {
            totalElement.innerHTML = `
                <span>Total</span>
                <span>$${total.toFixed(2)}</span>
            `;
        }
    }
}

/**
 * Process payment for the selected plan
 */
function processPayment(planName) {
    console.log(`Processing payment for ${planName} plan`);
    
    // For demo purposes, simulate a successful payment
    // In a real app, this would connect to Stripe or another payment processor
    const mockSubscriptionId = 'sub_' + Math.random().toString(36).substr(2, 9);
    
    // Simulate processing delay
    const button = document.querySelector('.order-summary button');
    if (button) {
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Processing...';
        
        setTimeout(() => {
            // Handle successful payment after "processing"
            handleSuccessfulPayment(planName, mockSubscriptionId);
            
            // Reset button (though user will be redirected, this is for safety)
            button.disabled = false;
            button.textContent = originalText;
        }, 1500);
    } else {
        // No button found, just process immediately
        handleSuccessfulPayment(planName, mockSubscriptionId);
    }
}

/**
 * Load user profile data from localStorage and update UI
 */
function loadUserProfile() {
    // Get user data from localStorage
    const userDataString = localStorage.getItem('mailtune_user');
    if (!userDataString) return;
    
    try {
        const userData = JSON.parse(userDataString);
        
        // Update profile picture if it exists on the page
        const profilePicElement = document.querySelector('.profile-picture') || document.querySelector('.user-avatar');
        if (profilePicElement) {
            if (userData.avatar_url) {
                profilePicElement.src = userData.avatar_url;
            } else {
                // If no avatar provided, use initials with ui-avatars
                const initials = userData.name ? userData.name : userData.email.split('@')[0];
                profilePicElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=A15DF8&color=fff`;
            }
        }
        
        // Update user name if it exists on the page
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement && userData.name) {
            userNameElement.textContent = userData.name;
        }
        
        // Update user email if it exists on the page
        const userEmailElement = document.querySelector('.user-email');
        if (userEmailElement && userData.email) {
            userEmailElement.textContent = userData.email;
        }
        
        console.log('User profile data loaded successfully');
    } catch (error) {
        console.error('Error loading user profile data:', error);
    }
} 