// Review Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const stars = document.querySelectorAll('.star-wrapper a');
    const ratingText = document.getElementById('ratingText');
    const reviewForm = document.getElementById('reviewForm');
    const thankYou = document.getElementById('thankYou');
    const submitBtn = document.querySelector('.submit-btn');
    let selectedRating = 0;
    let userData = null;
    let isSubmitting = false; // Flag to prevent multiple submissions

    // Get BIS parameter and user data
    const urlParams = new URLSearchParams(window.location.search);
    const businessNumber = urlParams.get('BIS');

    // Load user data if BIS parameter exists
    if (businessNumber) {
        loadUserData(businessNumber);
    }

    // Rating text options
    const ratingTexts = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent'
    };

    // Initially hide submit button
    if (submitBtn) {
        submitBtn.style.display = 'none';
    }

    // Star rating functionality
    stars.forEach((star, index) => {
        star.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Prevent multiple submissions
            if (isSubmitting) {
                return;
            }
            
            selectedRating = parseInt(this.dataset.rating);
            updateStars(selectedRating);
            updateRatingText(selectedRating);
            handleRatingSelection(selectedRating);
        });

        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });

    // Reset stars on mouse leave
    document.querySelector('.star-wrapper').addEventListener('mouseleave', function() {
        if (selectedRating > 0) {
            updateStars(selectedRating);
        } else {
            updateStars(0);
        }
    });

    function updateStars(rating) {
        stars.forEach((star, index) => {
            const starRating = parseInt(star.dataset.rating);
            if (starRating <= rating) {
                star.classList.add('active');
                star.style.color = '#ffd700';
            } else {
                star.classList.remove('active');
                star.style.color = '#ddd';
            }
        });
    }

    function highlightStars(rating) {
        stars.forEach((star, index) => {
            const starRating = parseInt(star.dataset.rating);
            if (starRating <= rating) {
                star.style.color = '#ffd700';
            } else {
                star.style.color = '#ddd';
            }
        });
    }

    function updateRatingText(rating) {
        if (ratingText) {
            ratingText.textContent = ratingTexts[rating] || 'Click to rate';
        }
    }

    // Load user data to get Google Review URL and buttons
    async function loadUserData(businessNumber) {
        try {
            const response = await fetch(`/api/user/${businessNumber}`);
            const data = await response.json();
            
            if (data.success) {
                userData = data.user;
                console.log('User data loaded:', userData);
                
                // Load action buttons if they exist
                loadActionButtons(userData.buttons);
                
                // Load social links if they exist
                loadSocialLinks(userData.socialLinks);
                
                // If hideReviewTab is enabled, show action buttons container immediately if buttons exist
                if (userData.hideReviewTab && userData.buttons && userData.buttons.length > 0) {
                    const enabledButtons = userData.buttons.filter(button => button.enabled !== false);
                    if (enabledButtons.length > 0) {
                        const container = document.getElementById('actionButtonsContainer');
                        if (container) {
                            container.style.display = 'block';
                        }
                    }
                }
            } else {
                console.error('Failed to load user data:', data.error);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Load action buttons from user data
    function loadActionButtons(buttons) {
        const container = document.getElementById('actionButtonsContainer');
        const grid = document.getElementById('actionButtonsGrid');
        
        if (!buttons || !Array.isArray(buttons) || buttons.length === 0) {
            // No buttons to display
            return;
        }

        // Filter enabled buttons only
        const enabledButtons = buttons.filter(button => button.enabled !== false);
        
        if (enabledButtons.length === 0) {
            // No enabled buttons to display
            return;
        }
        
        // Clear existing buttons
        grid.innerHTML = '';
        
        // Create button elements
        enabledButtons.forEach(button => {
            const buttonElement = createActionButton(button);
            grid.appendChild(buttonElement);
        });
        
        // Show the container
        container.style.display = 'block';
    }

    // Create individual action button element
    function createActionButton(button) {
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'action-button';
        buttonDiv.onclick = () => handleButtonClick(button.url, button);
        
        // Create button content
        let buttonContent = '';
        
        if (button.icon && (button.icon.startsWith('http') || button.icon.includes('data:image'))) {
            // Use custom icon/image
            buttonContent = `
                <div class="button-icon">
                    <img src="${button.icon}" alt="${button.text}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="fallback-icon" style="display: none;">
                        <i class="fas fa-link"></i>
                    </div>
                </div>
            `;
            } else {
            // Use default icon
            buttonContent = `
                <div class="button-icon">
                    <i class="fas fa-link"></i>
                </div>
            `;
        }
        
        buttonContent += `
            <div class="button-text">
                <span>${button.text}</span>
            </div>
        `;
        
        buttonDiv.innerHTML = buttonContent;
        return buttonDiv;
    }

    // Handle button click with device-specific URL support
    function handleButtonClick(url, buttonData = null) {
        if (url) {
            // Check if it's a UPI link
            if (url.startsWith('upi://')) {
                handleUPIPayment(url);
                return;
            }
            
            // Handle device-specific URLs
            if (buttonData && buttonData.deviceSpecific) {
                const userAgent = navigator.userAgent.toLowerCase();
                let targetUrl = url; // Default fallback
                
                if (/android/.test(userAgent)) {
                    targetUrl = buttonData.androidUrl || buttonData.desktopUrl || url;
                } else if (/iphone|ipad|ipod/.test(userAgent)) {
                    targetUrl = buttonData.iosUrl || buttonData.desktopUrl || url;
                } else {
                    // Desktop or other devices
                    targetUrl = buttonData.desktopUrl || url;
                }
                
                window.open(targetUrl, '_blank');
            } else {
                // Regular URL - open in new tab
                window.open(url, '_blank');
            }
        } else {
            console.error('No URL provided for button');
        }
    }

    // Handle UPI payment with better iOS/Android compatibility
    function handleUPIPayment(upiUrl) {
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        
        if (isIOS) {
            // For iOS, show UPI app chooser modal
            showUPIAppChooser(upiUrl);
        } else {
            // For Android and others, use direct link
            window.location.href = upiUrl;
        }
    }

    // Convert UPI URL for iOS based on the original prefix
    function convertUPIForIOS(upiUrl) {
        // Extract the original prefix and parameters
        const urlParts = upiUrl.split('://');
        const originalPrefix = urlParts[0];
        const params = urlParts[1];
        
        // Map of original prefixes to iOS-specific prefixes
        const prefixMap = {
            'upi': 'tez', // Convert generic UPI to Google Pay for iOS
            'tez': 'tez', // Google Pay (unchanged)
            'phonepe': 'phonepe', // PhonePe (unchanged)
            'paytmmp': 'paytmmp', // Paytm (unchanged)
            'bhim': 'bhim', // BHIM (unchanged)
            'gpay': 'tez', // Google Pay alternative
            'paytm': 'paytmmp' // Paytm alternative
        };
        
        // Get the iOS-specific prefix
        const iosPrefix = prefixMap[originalPrefix] || 'tez'; // Default to Google Pay
        
        // Return the converted URL
        return `${iosPrefix}://${params}`;
    }

    // Show UPI app chooser for iOS
    function showUPIAppChooser(upiUrl) {
        // Extract UPI details from the URL
        const urlParams = new URLSearchParams(upiUrl.split('?')[1]);
        const pa = urlParams.get('pa'); // UPI ID
        const pn = urlParams.get('pn'); // Payee name
        const cu = urlParams.get('cu'); // Currency
        
        // Create different UPI URLs for different apps
        const upiApps = [
            {
                name: 'Google Pay',
                url: `tez://upi/pay?pa=${pa}&pn=${pn}&cu=${cu}`,
                fallback: upiUrl
            },
            {
                name: 'PhonePe',
                url: `phonepe://pay?pa=${pa}&pn=${pn}&cu=${cu}`,
                fallback: upiUrl
            },
            {
                name: 'Paytm',
                url: `paytmmp://pay?pa=${pa}&pn=${pn}&cu=${cu}`,
                fallback: upiUrl
            },
            {
                name: 'BHIM',
                url: `bhim://upi/pay?pa=${pa}&pn=${pn}&cu=${cu}`,
                fallback: upiUrl
            },
            {
                name: 'WhatsApp UPI',
                url: upiUrl,
                fallback: upiUrl
            }
        ];
        
        // Show the UPI options modal
        showUPIOptions(upiApps);
    }

    // Show UPI options modal
    function showUPIOptions(upiApps) {
        const modal = document.createElement('div');
        modal.className = 'upi-chooser-modal';
        modal.innerHTML = `
            <div class="upi-chooser-content">
                <div class="upi-chooser-header">
                    <h3>Choose Payment App</h3>
                    <button class="upi-chooser-close">&times;</button>
                </div>
                <div class="upi-chooser-body">
                    <p>Select your preferred UPI app:</p>
                    <div class="upi-apps-grid">
                        ${upiApps.map((app, index) => `
                            <button class="upi-app-btn" data-url="${app.url}" data-name="${app.name}">
                                <div class="upi-app-icon">
                                    ${getAppIcon(app.name)}
                                </div>
                                <div class="upi-app-name">${app.name}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners to UPI app buttons
        const appButtons = modal.querySelectorAll('.upi-app-btn');
        appButtons.forEach(button => {
            button.addEventListener('click', function() {
                const url = this.getAttribute('data-url');
                const name = this.getAttribute('data-name');
                openUPIApp(url, name);
            });
        });
        
        // Add event listener to close button
        const closeButton = modal.querySelector('.upi-chooser-close');
        closeButton.addEventListener('click', closeUPIChooser);
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .upi-chooser-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            .upi-chooser-content {
                background: white;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            .upi-chooser-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e9ecef;
            }
            .upi-chooser-header h3 {
                margin: 0;
                color: #333;
            }
            .upi-chooser-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6c757d;
            }
            .upi-chooser-body {
                padding: 20px;
            }
            .upi-apps-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 15px;
            }
            .upi-app-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px 15px;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                background: white;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                color: #333;
            }
            .upi-app-btn:hover {
                border-color: #667eea;
                background: #f8f9ff;
                transform: translateY(-2px);
            }
            .upi-app-icon {
                font-size: 32px;
                margin-bottom: 10px;
                color: #667eea;
            }
            .upi-app-name {
                font-size: 14px;
                font-weight: 600;
                text-align: center;
            }
            @media (max-width: 480px) {
                .upi-apps-grid {
                    grid-template-columns: 1fr 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Get app icon
    function getAppIcon(appName) {
        switch(appName) {
            case 'Google Pay':
                return '<i class="fab fa-google-pay"></i>';
            case 'PhonePe':
                return '<i class="fas fa-mobile-alt"></i>';
            case 'Paytm':
                return '<i class="fas fa-wallet"></i>';
            case 'BHIM':
                return '<i class="fas fa-university"></i>';
            case 'WhatsApp UPI':
                return '<i class="fab fa-whatsapp"></i>';
            default:
                return '<i class="fas fa-credit-card"></i>';
        }
    }

    // Open specific UPI app
    function openUPIApp(url, appName) {
        try {
            window.location.href = url;
        } catch (e) {
            console.log(`Failed to open ${appName}:`, e);
            // Try fallback
            window.location.href = url;
        }
        
        // Close modal
        closeUPIChooser();
    }

    // Close UPI chooser modal
    function closeUPIChooser() {
        const modal = document.querySelector('.upi-chooser-modal');
        if (modal) {
            modal.remove();
        }
    }


    // Load social links from user data
    function loadSocialLinks(socialLinks) {
        const container = document.getElementById('socialLinksContainer');
        
        if (!socialLinks || !Array.isArray(socialLinks) || socialLinks.length === 0) {
            // No social links to display, hide the footer section
            const footer = document.querySelector('.review-footer');
            if (footer) {
                footer.style.display = 'none';
            }
            return;
        }
        
        // Filter enabled social links only
        const enabledSocialLinks = socialLinks.filter(social => social.enabled !== false);
        
        if (enabledSocialLinks.length === 0) {
            // No enabled social links, hide the footer section
            const footer = document.querySelector('.review-footer');
            if (footer) {
                footer.style.display = 'none';
            }
            return;
        }
        
        // Clear existing social links
        container.innerHTML = '';
        
        // Create social link elements
        enabledSocialLinks.forEach(social => {
            const socialElement = createSocialLink(social);
            container.appendChild(socialElement);
        });
        
        // Show the footer section
        const footer = document.querySelector('.review-footer');
        if (footer) {
            footer.style.display = 'block';
        }
    }

    // Create individual social link element
    function createSocialLink(social) {
        const linkElement = document.createElement('a');
        linkElement.className = 'social-link';
        linkElement.href = social.url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        
        // Extract platform name from icon class for title
        const platformName = getPlatformName(social.icon);
        linkElement.title = platformName;
        
        // Create icon element
        const iconElement = document.createElement('i');
        iconElement.className = social.icon;
        
        linkElement.appendChild(iconElement);
        return linkElement;
    }

    // Get platform name from icon class
    function getPlatformName(iconClass) {
        const platformMap = {
            'fab fa-facebook': 'Facebook',
            'fab fa-facebook-f': 'Facebook',
            'fab fa-twitter': 'Twitter',
            'fab fa-instagram': 'Instagram',
            'fab fa-linkedin': 'LinkedIn',
            'fab fa-linkedin-in': 'LinkedIn',
            'fab fa-youtube': 'YouTube',
            'fab fa-whatsapp': 'WhatsApp',
            'fab fa-telegram': 'Telegram',
            'fab fa-discord': 'Discord',
            'fab fa-github': 'GitHub',
            'fab fa-twitch': 'Twitch',
            'fab fa-tiktok': 'TikTok',
            'fab fa-snapchat': 'Snapchat',
            'fab fa-pinterest': 'Pinterest',
            'fab fa-reddit': 'Reddit',
            'fab fa-skype': 'Skype',
            'fab fa-viber': 'Viber',
            'fab fa-wechat': 'WeChat',
            'fab fa-snapchat-ghost': 'Snapchat',
            'fab fa-google-plus': 'Google+',
            'fab fa-vimeo': 'Vimeo'
        };
        
        return platformMap[iconClass] || 'Social Media';
    }

    // Handle rating selection logic
    function handleRatingSelection(rating) {
        // Set flag to prevent multiple submissions
        isSubmitting = true;
        
        // Add loading state to stars
        stars.forEach(star => {
            star.style.opacity = '0.6';
            star.style.pointerEvents = 'none';
        });
        
        // Get minimum rating threshold from user data (default to 0 if not set)
        const minimumRating = userData ? (userData.minimumRating || 0) : 0;
        
        if (rating >= minimumRating) {
            // Rating meets or exceeds threshold: Redirect to Google Review URL
            redirectToGoogleReview();
        } else {
            // Rating below threshold: Auto-submit and redirect to thank you page
            submitReview(rating);
        }
    }

    // Submit review for ratings below minimum threshold
    async function submitReview(rating) {
        try {
            const reviewData = {
                businessNumber: businessNumber,
                rating: rating,
                timestamp: new Date().toISOString(),
                type: 'internal_review'
            };

            const response = await fetch('/api/submit-review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reviewData)
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to thank you page instead of showing popup
                redirectToThankYouPage(rating);
            } else {
                console.error('Failed to submit review:', data.error);
                // Still redirect to thank you page even if API fails
                redirectToThankYouPage(rating);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            // Still redirect to thank you page even if API fails
            redirectToThankYouPage(rating);
        }
    }

    // Redirect to thank you page
    function redirectToThankYouPage(rating) {
        const params = new URLSearchParams();
        if (businessNumber) {
            params.append('BIS', businessNumber);
        }
        if (rating) {
            params.append('rating', rating);
        }
        
        const thankYouUrl = `/thank-you?${params.toString()}`;
        window.location.href = thankYouUrl;
    }

    // Redirect to Google Review URL
    function redirectToGoogleReview() {
        if (userData && userData.reviewUrl) {
            // Open Google Review URL in new tab
            window.open(userData.reviewUrl, '_blank');
        } else {
            // Fallback: Show message that no Google Review URL is available
            alert('Thank you for your positive rating! Unfortunately, we don\'t have a Google Review link set up yet. Your feedback is still appreciated!');
        }
    }

    // Form submission (now handled automatically by star clicks)
    // The submit button is hidden and reviews are submitted automatically


    // Submit button is now hidden and not used

    // Form validation and loading states removed since we use automatic submission
});

// Add some visual feedback for star interactions
document.addEventListener('DOMContentLoaded', function() {
    const stars = document.querySelectorAll('.star-wrapper a');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            // Add a subtle animation
            this.style.transform = 'scale(1.3)';
            setTimeout(() => {
                this.style.transform = 'scale(1.2)';
            }, 150);
        });
    });
});
