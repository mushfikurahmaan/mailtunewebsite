// Check if the user is logged in and update the navbar accordingly
document.addEventListener('DOMContentLoaded', function() {
    // Get auth token from localStorage
    const token = localStorage.getItem('mailtune_token');
    const userData = JSON.parse(localStorage.getItem('mailtune_user') || '{}');
    
    // If token exists, user is logged in
    if (token && userData) {
        // ---------- HANDLE FREE BUTTONS ----------
        // Direct approach - immediately replace all free buttons with dashboard links
        const freeButtons = document.querySelectorAll('[data-plan-type="FREE"]');
        
        freeButtons.forEach((button) => {
            // Create a completely new button that goes to dashboard
            const dashboardLink = document.createElement('a');
            dashboardLink.href = '/accounts/dashboard/';
            dashboardLink.className = button.className;
            dashboardLink.textContent = button.textContent;
            dashboardLink.setAttribute('onclick', "window.location.href='/accounts/dashboard/'; return false;");
            
            // Hard replace the button
            button.parentNode.replaceChild(dashboardLink, button);
        });
        
        // ---------- HANDLE REMAINING CTA BUTTONS ----------
        // Replace any remaining CTA buttons with dashboard links
        const ctaButtons = document.querySelectorAll('.signup-cta');
        
        ctaButtons.forEach((button) => {
            const dashboardLink = document.createElement('a');
            dashboardLink.href = '/accounts/dashboard/';
            dashboardLink.className = button.className;
            dashboardLink.textContent = 'Dashboard';
            
            button.parentNode.replaceChild(dashboardLink, button);
        });
        
        // ---------- HANDLE PAID PLAN BUTTONS ----------
        // Ensure paid plan buttons go to checkout
        const paidPlanButtons = document.querySelectorAll('[data-plan-type="STARTER"], [data-plan-type="PREMIUM"], [data-plan-type="BUSINESS"]');
        
        paidPlanButtons.forEach((button) => {
            // Hard replace with new checkout buttons to avoid issues
            const checkoutButton = document.createElement('a');
            checkoutButton.href = '/accounts/checkout/';
            checkoutButton.className = button.className;
            checkoutButton.textContent = button.textContent;
            checkoutButton.setAttribute('data-plan-type', button.getAttribute('data-plan-type'));
            checkoutButton.setAttribute('onclick', "window.location.href='/accounts/checkout/'; return false;");
            
            button.parentNode.replaceChild(checkoutButton, button);
        });
    }
});