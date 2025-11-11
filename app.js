const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
require('dotenv').config();

// Import Firebase admin
const { admin } = require('./config/firebase');

// Import services
const userService = require('./services/userService');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use express layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true, // Prevent client-side access
        sameSite: 'lax' // CSRF protection
    },
    name: 'kochi-one.sid' // Custom session name
}));

// Session debugging middleware
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        console.log(`Session active for ${req.session.user.email} (${req.session.user.role}) - ${new Date().toISOString()}`);
    }
    next();
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

// Routes
// Home route - now shows review page
app.get('/', async (req, res) => {
    try {
        const { BIS } = req.query;
        let userData = null;
        let bannerImage = '/images/images-3.jpeg'; // Default banner image
        
        // If BIS parameter is provided, fetch user data
        if (BIS) {
            try {
                const user = await userService.getUserByBusinessNumber(BIS);
                if (user && user.bannerImage) {
                    userData = user;
                    bannerImage = user.bannerImage;
                }
            } catch (error) {
                console.error('Error fetching user data for review:', error);
                // Continue with default banner if user fetch fails
            }
        }
        
        res.render('review', { 
            title: 'Rate Us - Kochi One',
            page: 'review',
            layout: false,
            userData: userData,
            bannerImage: bannerImage
        });
    } catch (error) {
        console.error('Error in review route:', error);
        // Fallback to default review page
        res.render('review', { 
            title: 'Rate Us - Kochi One',
            page: 'review',
            layout: false,
            userData: null,
            bannerImage: '/images/images-3.jpeg'
        });
    }
});

// Thank you page route
app.get('/thank-you', async (req, res) => {
    try {
        const { BIS, rating } = req.query;
        let userData = null;
        
        // If BIS parameter is provided, fetch user data
        if (BIS) {
            try {
                const user = await userService.getUserByBusinessNumber(BIS);
                if (user) {
                    userData = user;
                }
            } catch (error) {
                console.error('Error fetching user data for thank you page:', error);
            }
        }
        
        res.render('thank-you', { 
            title: 'Thank You - Kochi One',
            page: 'thank-you',
            layout: false,
            userData: userData,
            rating: parseInt(rating) || 0
        });
    } catch (error) {
        console.error('Error in thank you route:', error);
        // Fallback to default thank you page
        res.render('thank-you', { 
            title: 'Thank You - Kochi One',
            page: 'thank-you',
            layout: false,
            userData: null,
            rating: 0
        });
    }
});

// Menu page route
app.get('/menu', async (req, res) => {
    try {
        const { BIS } = req.query;
        let userData = null;
        let menuPdf = null;
        
        // If BIS parameter is provided, fetch user data and menu
        if (BIS) {
            try {
                const user = await userService.getUserByBusinessNumber(BIS);
                if (user && user.menuPdf) {
                    userData = user;
                    menuPdf = user.menuPdf;
                }
            } catch (error) {
                console.error('Error fetching user data for menu page:', error);
            }
        }
        
        res.render('menu', { 
            title: 'Menu - Kochi One',
            page: 'menu',
            layout: false,
            userData: userData,
            menuPdf: menuPdf
        });
    } catch (error) {
        console.error('Error in menu route:', error);
        // Fallback to default menu page
        res.render('menu', { 
            title: 'Menu - Kochi One',
            page: 'menu',
            layout: false,
            userData: null,
            menuPdf: null
        });
    }
});

app.post('/contact', (req, res) => {
    // Basic contact form handling
    const { name, email, message } = req.body;
    console.log('Contact form submission:', { name, email, message });
    res.redirect('/contact?success=true');
});

// Admin Routes
const { requireAuth, requireAdminAuth, requireUserAuth, redirectIfAuthenticated, redirectIfAdminAuthenticated, redirectIfUserAuthenticated } = require('./middleware/auth');

// Debug endpoint to check environment variables
app.get('/admin/debug', (req, res) => {
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) : [];
    res.json({
        adminEmails: adminEmails,
        adminEmailsRaw: process.env.ADMIN_EMAILS,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Admin login page
app.get('/admin/login', redirectIfAdminAuthenticated, (req, res) => {
    res.render('admin/login', { 
        title: 'Admin Login - Kochi One',
        process: { env: process.env },
        layout: false // Don't use the main layout
    });
});

// Verify Firebase token (Admin)
app.post('/admin/verify-token', async (req, res) => {
    try {
        console.log('Received admin token verification request');
        const { idToken } = req.body;
        
        if (!idToken) {
            return res.status(400).json({ error: 'No token provided' });
        }
        
        console.log('Verifying token with Firebase...');
        const { admin } = require('./config/firebase');
        
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('Token verified, email:', decodedToken.email);
        
        // Check if the email is one of the admin emails (case-insensitive)
        const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) : [];
        const userEmail = decodedToken.email.toLowerCase();
        console.log('Admin emails from env:', adminEmails);
        console.log('User email from token:', userEmail);
        console.log('Email match check:', adminEmails.includes(userEmail));
        
        if (!adminEmails.includes(userEmail)) {
            console.log('Access denied for email:', decodedToken.email);
            console.log('User email (lowercase):', userEmail);
            console.log('Available admin emails:', adminEmails);
            console.log('Email comparison failed');
            return res.status(403).json({ 
                error: 'Access denied. Admin email required.',
                debug: {
                    userEmail: decodedToken.email,
                    userEmailLower: userEmail,
                    adminEmails: adminEmails,
                    matchFound: adminEmails.includes(userEmail)
                }
            });
        }
        
        // Store user info in session
        req.session.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
            role: 'admin'
        };
        
        console.log('Admin session created for user:', decodedToken.email);
        res.json({ success: true, message: 'Admin authentication successful' });
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Verify Firebase token (User)
app.post('/user/verify-token', async (req, res) => {
    try {
        console.log('Received user token verification request');
        const { idToken } = req.body;
        
        if (!idToken) {
            return res.status(400).json({ error: 'No token provided' });
        }
        
        console.log('Verifying token with Firebase...');
        const { admin } = require('./config/firebase');
        
        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('Token verified, email:', decodedToken.email);
        
        // Check if user exists in database
        const userData = await userService.getUserByEmail(decodedToken.email);
        
        if (!userData) {
            console.log('User not found in database:', decodedToken.email);
            return res.status(404).json({ 
                error: 'User not found. Please contact support.',
                email: decodedToken.email
            });
        }
        
        // Store user info in session
        req.session.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture,
            role: 'user',
            businessNumber: userData.businessNumber
        };
        
        console.log('User session created for:', decodedToken.email);
        res.json({ success: true, message: 'User authentication successful' });
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Admin dashboard
app.get('/admin/dashboard', requireAdminAuth, (req, res) => {
    res.render('admin/dashboard', { 
        title: 'Admin Dashboard - Kochi One',
        user: req.session.user,
        layout: false // Don't use the main layout
    });
});

// Admin analytics page
app.get('/admin/analytics', requireAdminAuth, (req, res) => {
    res.render('admin/analytics', { 
        title: 'Analytics Dashboard - Kochi One',
        user: req.session.user,
        layout: false // Don't use the main layout
    });
});

// User login page (for individual users)
app.get('/user/login', redirectIfUserAuthenticated, (req, res) => {
    res.render('user/login', { 
        title: 'User Login - Kochi One',
        layout: false // Don't use the main layout
    });
});

// User dashboard (for individual users)
app.get('/user/dashboard', requireUserAuth, async (req, res) => {
    try {
        // Get user data by email
        const userData = await userService.getUserByEmail(req.session.user.email);
        
        if (!userData) {
            // User not found in database, redirect to login
            return res.redirect('/user/login?error=not_found');
        }
        
        res.render('user/dashboard', { 
            title: 'My Dashboard - Kochi One',
            user: req.session.user,
            userData: userData,
            layout: false // Don't use the main layout
        });
    } catch (error) {
        console.error('Error loading user dashboard:', error);
        res.redirect('/user/login?error=server_error');
    }
});

// Admin logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/admin/login');
    });
});

// User logout
app.get('/user/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/user/login');
    });
});

// Session refresh endpoint for admin
app.post('/admin/refresh-session', requireAdminAuth, (req, res) => {
    // Touch the session to refresh it
    req.session.touch();
    res.json({ success: true, message: 'Session refreshed' });
});

// Session refresh endpoint for user
app.post('/user/refresh-session', requireUserAuth, (req, res) => {
    // Touch the session to refresh it
    req.session.touch();
    res.json({ success: true, message: 'Session refreshed' });
});

// Image upload endpoint
app.post('/admin/upload-image', requireAdminAuth, async (req, res) => {
    try {
        console.log('Admin upload request received:', { type: req.body.type, hasImageData: !!req.body.imageData });
        
        const { imageData, type } = req.body;
        
        if (!imageData || !type) {
            console.log('Missing required fields:', { imageData: !!imageData, type: !!type });
            return res.status(400).json({
                success: false,
                error: 'Image data and type are required'
            });
        }

        // Extract image format and data
        const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image data format'
            });
        }

        const imageFormat = matches[1].toLowerCase();
        const base64Data = matches[2];

        // Validate image format - support PNG and other formats
        const allowedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg+xml'];
        if (!allowedFormats.includes(imageFormat)) {
            return res.status(400).json({
                success: false,
                error: `Unsupported image format. Allowed formats: ${allowedFormats.join(', ')}`
            });
        }

        // Validate file size (5MB limit)
        const fileSizeInBytes = (base64Data.length * 3) / 4;
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        
        if (fileSizeInBytes > maxSizeInBytes) {
            return res.status(400).json({
                success: false,
                error: 'File size too large. Maximum size is 5MB'
            });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename with correct extension
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${type}_${timestamp}_${randomString}.${imageFormat}`;
        const filePath = `user-images/${filename}`;
        
        // Upload to Firebase Storage
        console.log('Firebase Storage Bucket:', process.env.FIREBASE_STORAGE_BUCKET);
        
        const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
        const file = bucket.file(filePath);
        
        console.log(`Uploading ${type} image to Firebase Storage: ${filePath}`);
        
        try {
            // Upload the file
            await file.save(buffer, {
                metadata: {
                    contentType: `image/${imageFormat}`,
                    cacheControl: 'public, max-age=31536000'
                }
            });
            
            console.log(`File uploaded successfully: ${filePath}`);
            
            // Make the file publicly accessible
            await file.makePublic();
            
            console.log(`File made public: ${filePath}`);
            
            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${filePath}`;
            
            console.log(`Public URL: ${publicUrl}`);
            
            res.json({
                success: true,
                url: publicUrl,
                message: 'Image uploaded successfully to Firebase Storage'
            });
        } catch (firebaseError) {
            console.error('Firebase Storage error:', firebaseError);
            
            // If Firebase Storage fails, return a placeholder but still show success
            // This allows the UI to work while Firebase Storage is being configured
            const placeholderSvg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="200" fill="transparent" stroke="#ddd" stroke-width="2" stroke-dasharray="5,5"/>
                <text x="150" y="100" text-anchor="middle" fill="#999" font-family="Arial" font-size="16">${type.toUpperCase()} PLACEHOLDER</text>
            </svg>`;
            const placeholderUrl = `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString('base64')}`;
            
            res.json({
                success: true,
                url: placeholderUrl,
                message: 'Firebase Storage error. Using placeholder. Please check Firebase Storage setup.',
                error: firebaseError.message
            });
        }
        
    } catch (error) {
        console.error('Image upload error:', error);
        
        // If Firebase Storage fails, return a placeholder but still show success
        // This allows the UI to work while Firebase Storage is being configured
        const placeholderSvg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="200" fill="transparent" stroke="#ddd" stroke-width="2" stroke-dasharray="5,5"/>
            <text x="150" y="100" text-anchor="middle" fill="#999" font-family="Arial" font-size="16">${type.toUpperCase()} PLACEHOLDER</text>
        </svg>`;
        const placeholderUrl = `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString('base64')}`;
        
        res.json({
            success: true,
            url: placeholderUrl,
            message: 'Firebase Storage not configured. Using placeholder. Please check Firebase Storage setup.'
        });
    }
});

// User Management Routes
// Get all users
app.get('/admin/users', requireAdminAuth, async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ success: false, error: 'Failed to get users' });
    }
});

// Create new user
app.post('/admin/users', requireAdminAuth, async (req, res) => {
    try {
        const { name, email, mobileNumber } = req.body;
        
        if (!name || !email || !mobileNumber) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, email, and mobile number are required' 
            });
        }

        const user = await userService.createUser({
            name,
            email,
            mobileNumber,
            createdBy: req.session.user.email
        });

        res.json({ success: true, user });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
});

// Update user
app.put('/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const rawData = req.body;

        // Process form data to convert arrays to proper objects
        const userData = {
            name: rawData.name,
            email: rawData.email,
            mobileNumber: rawData.mobileNumber,
            bannerImage: rawData.bannerImage,
            logo: rawData.logo,
            reviewUrl: rawData.reviewUrl,
            minimumRating: parseInt(rawData.minimumRating) || 0
        };

        console.log('Raw data received:', rawData);

        // Process buttons array - handle both form data structure and direct array
        let buttons = [];
        
        if (rawData.buttons && Array.isArray(rawData.buttons)) {
            // Direct array format (from new frontend processing)
            buttons = rawData.buttons.filter(button => {
                if (!button.text) return false;
                // For device-specific URLs, check if at least one URL is provided
                if (button.deviceSpecific) {
                    return button.desktopUrl || button.androidUrl || button.iosUrl;
                }
                // For regular URLs, check the main URL
                return button.url;
            });
            console.log('Using direct buttons array:', buttons);
        } else {
            // Legacy form data structure
            const buttonKeys = Object.keys(rawData).filter(key => key.startsWith('buttons[') && key.includes('][text]'));
            
            buttonKeys.forEach(key => {
                const index = key.match(/buttons\[(\d+)\]/)[1];
                const buttonData = {
                    text: rawData[`buttons[${index}][text]`],
                    url: rawData[`buttons[${index}][url]`],
                    icon: rawData[`buttons[${index}][icon]`] || '',
                    enabled: rawData[`buttons[${index}][enabled]`] === 'on'
                };
                
                if (buttonData.text && buttonData.url) {
                    buttons.push(buttonData);
                }
            });
            console.log('Processed buttons from form data:', buttons);
        }
        
        if (buttons.length > 0) {
            userData.buttons = buttons;
        } else {
            // If no buttons, set empty array to clear existing buttons
            userData.buttons = [];
        }

        // Process social links array - handle both form data structure and direct array
        let socialLinks = [];
        
        if (rawData.socialLinks && Array.isArray(rawData.socialLinks)) {
            // Direct array format (from new frontend processing)
            socialLinks = rawData.socialLinks.filter(social => social.icon && social.url);
            console.log('Using direct social links array:', socialLinks);
        } else {
            // Legacy form data structure
            const socialKeys = Object.keys(rawData).filter(key => key.startsWith('socialLinks[') && key.includes('][icon]'));
            
            socialKeys.forEach(key => {
                const index = key.match(/socialLinks\[(\d+)\]/)[1];
                const socialData = {
                    icon: rawData[`socialLinks[${index}][icon]`],
                    url: rawData[`socialLinks[${index}][url]`],
                    enabled: rawData[`socialLinks[${index}][enabled]`] === 'on'
                };
                
                if (socialData.icon && socialData.url) {
                    socialLinks.push(socialData);
                }
            });
            console.log('Processed social links from form data:', socialLinks);
        }
        
        if (socialLinks.length > 0) {
            userData.socialLinks = socialLinks;
        } else {
            // If no social links, set empty array to clear existing social links
            userData.socialLinks = [];
        }

        console.log('Final user data to save:', userData);

        const user = await userService.updateUser(id, userData);
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

// Delete user
app.delete('/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Delete request received for user ID:', id);
        
        const result = await userService.deleteUser(id);
        console.log('Delete result:', result);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
});

// Get user by ID
app.get('/admin/users/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ success: false, error: 'Failed to get user' });
    }
});

// Test delete functionality
app.post('/admin/test-delete/:id', requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Test delete for user ID:', id);
        
        // First check if user exists
        const user = await userService.getUserById(id);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }
        
        console.log('User found:', user);
        
        // Try to delete
        const result = await userService.deleteUser(id);
        console.log('Delete result:', result);
        
        res.json({ success: true, message: 'Test delete completed' });
    } catch (error) {
        console.error('Test delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Public API - Get user data by business number (no authentication required)
app.get('/api/user/:businessNumber', async (req, res) => {
    try {
        const { businessNumber } = req.params;
        
        if (!businessNumber) {
            return res.status(400).json({
                success: false,
                error: 'Business number is required'
            });
        }

        // Validate business number format (BIS followed by 5 digits)
        const businessNumberRegex = /^BIS\d{5}$/;
        if (!businessNumberRegex.test(businessNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business number format. Expected format: BIS00001'
            });
        }

        const user = await userService.getUserByBusinessNumber(businessNumber);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Error getting user by business number:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Track review page visit
app.post('/api/track-visit', async (req, res) => {
    try {
        const { businessNumber } = req.body;
        
        if (!businessNumber) {
            return res.status(400).json({
                success: false,
                error: 'Business number is required'
            });
        }

        // Validate business number format
        const businessNumberRegex = /^BIS\d{5}$/;
        if (!businessNumberRegex.test(businessNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business number format'
            });
        }

        // Track the visit
        await userService.trackReviewPageVisit(businessNumber);
        
        res.json({
            success: true,
            message: 'Visit tracked successfully'
        });
    } catch (error) {
        console.error('Error tracking visit:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track visit'
        });
    }
});

// Submit review (for 1-3 star ratings)
app.post('/api/submit-review', async (req, res) => {
    try {
        const { businessNumber, rating, timestamp, type } = req.body;
        
        if (!businessNumber || !rating) {
            return res.status(400).json({
                success: false,
                error: 'Business number and rating are required'
            });
        }

        // Validate business number format
        const businessNumberRegex = /^BIS\d{5}$/;
        if (!businessNumberRegex.test(businessNumber)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid business number format'
            });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Rating must be between 1 and 5'
            });
        }

        // Track the review submission
        await userService.trackReviewSubmission(businessNumber, {
            rating: rating,
            timestamp: timestamp || new Date().toISOString(),
            type: type || 'internal_review'
        });
        
        res.json({
            success: true,
            message: 'Review submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit review'
        });
    }
});

// Get analytics data API
app.get('/admin/analytics/api', requireAdminAuth, async (req, res) => {
    try {
        const { timeRange = '30', userId, businessNumber } = req.query;
        
        const analytics = await userService.getAnalyticsData({
            timeRange: parseInt(timeRange),
            userId,
            businessNumber
        });
        
        res.json({
            success: true,
            analytics: analytics.users,
            summary: analytics.summary
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics data'
        });
    }
});

// User-specific API endpoints
// Get user's own data
app.get('/user/api/data', requireUserAuth, async (req, res) => {
    try {
        const userData = await userService.getUserByEmail(req.session.user.email);
        
        if (!userData) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: userData
        });
    } catch (error) {
        console.error('Error getting user data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user data'
        });
    }
});

// Update user's own data
app.put('/user/api/update', requireUserAuth, async (req, res) => {
    try {
        const userData = await userService.getUserByEmail(req.session.user.email);
        
        if (!userData) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const rawData = req.body;
        
        // Process form data similar to admin update
        const updateData = {
            name: rawData.name,
            email: rawData.email,
            mobileNumber: rawData.mobileNumber,
            bannerImage: rawData.bannerImage,
            logo: rawData.logo,
            reviewUrl: rawData.reviewUrl
        };

        // Process buttons array
        let buttons = [];
        if (rawData.buttons && Array.isArray(rawData.buttons)) {
            buttons = rawData.buttons.filter(button => {
                if (!button.text) return false;
                // For device-specific URLs, check if at least one URL is provided
                if (button.deviceSpecific) {
                    return button.desktopUrl || button.androidUrl || button.iosUrl;
                }
                // For regular URLs, check the main URL
                return button.url;
            });
        }
        updateData.buttons = buttons;

        // Process social links array
        let socialLinks = [];
        if (rawData.socialLinks && Array.isArray(rawData.socialLinks)) {
            socialLinks = rawData.socialLinks.filter(social => social.icon && social.url);
        }
        updateData.socialLinks = socialLinks;

        const updatedUser = await userService.updateUser(userData.id, updateData);
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
});

// Get user's own analytics
app.get('/user/api/analytics', requireUserAuth, async (req, res) => {
    try {
        const { timeRange = '30' } = req.query;
        const userData = await userService.getUserByEmail(req.session.user.email);
        
        if (!userData) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const analytics = await userService.getAnalyticsData({
            timeRange: parseInt(timeRange),
            businessNumber: userData.businessNumber
        });
        
        res.json({
            success: true,
            analytics: analytics.users[0] || null,
            summary: analytics.summary
        });
    } catch (error) {
        console.error('Error getting user analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get analytics data'
        });
    }
});

// Admin PDF upload endpoint
app.post('/admin/upload-pdf', requireAdminAuth, async (req, res) => {
    try {
        console.log('Admin PDF upload request received:', { hasPdfData: !!req.body.pdfData });
        
        const { pdfData, userId } = req.body;
        
        if (!pdfData || !userId) {
            console.log('Missing required fields:', { pdfData: !!pdfData, userId: !!userId });
            return res.status(400).json({
                success: false,
                error: 'PDF data and user ID are required'
            });
        }

        // Extract PDF format and data
        const matches = pdfData.match(/^data:application\/(pdf);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PDF data format'
            });
        }

        const pdfFormat = matches[1].toLowerCase();
        const base64Data = matches[2];

        // Validate PDF format
        if (pdfFormat !== 'pdf') {
            return res.status(400).json({
                success: false,
                error: 'Only PDF files are allowed'
            });
        }

        // Validate file size (10MB limit for PDFs)
        const fileSizeInBytes = (base64Data.length * 3) / 4;
        const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
        
        if (fileSizeInBytes > maxSizeInBytes) {
            return res.status(400).json({
                success: false,
                error: 'File size too large. Maximum size is 10MB'
            });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `menu_${userId}_${timestamp}_${randomString}.pdf`;
        const filePath = `user-menus/${filename}`;
        
        // Upload to Firebase Storage
        console.log('Firebase Storage Bucket:', process.env.FIREBASE_STORAGE_BUCKET);
        
        const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
        const file = bucket.file(filePath);
        
        console.log(`Uploading menu PDF to Firebase Storage: ${filePath}`);
        
        try {
            // Upload the file
            await file.save(buffer, {
                metadata: {
                    contentType: 'application/pdf',
                    cacheControl: 'public, max-age=31536000'
                }
            });
            
            console.log(`PDF uploaded successfully: ${filePath}`);
            
            // Make the file publicly accessible
            await file.makePublic();
            
            console.log(`PDF made public: ${filePath}`);
            
            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${filePath}`;
            
            console.log(`Public URL: ${publicUrl}`);
            
            // Update user with menu PDF URL
            await userService.updateUser(userId, { menuPdf: publicUrl });
            
            res.json({
                success: true,
                url: publicUrl,
                message: 'Menu PDF uploaded successfully to Firebase Storage'
            });
        } catch (firebaseError) {
            console.error('Firebase Storage error:', firebaseError);
            
            res.status(500).json({
                success: false,
                error: 'Failed to upload PDF to Firebase Storage',
                details: firebaseError.message
            });
        }
        
    } catch (error) {
        console.error('PDF upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload PDF'
        });
    }
});

// User PDF upload endpoint
app.post('/user/upload-pdf', requireUserAuth, async (req, res) => {
    try {
        const { pdfData } = req.body;
        
        if (!pdfData) {
            return res.status(400).json({
                success: false,
                error: 'PDF data is required'
            });
        }

        // Validate PDF data format
        if (!pdfData.startsWith('data:application/pdf')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PDF format'
            });
        }

        // Extract PDF format and data
        const matches = pdfData.match(/^data:application\/(pdf);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({
                success: false,
                error: 'Invalid PDF data format'
            });
        }

        const pdfFormat = matches[1].toLowerCase();
        const base64Data = matches[2];

        // Validate PDF format
        if (pdfFormat !== 'pdf') {
            return res.status(400).json({
                success: false,
                error: 'Only PDF files are allowed'
            });
        }

        // Validate file size (10MB limit for PDFs)
        const fileSizeInBytes = (base64Data.length * 3) / 4;
        const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
        
        if (fileSizeInBytes > maxSizeInBytes) {
            return res.status(400).json({
                success: false,
                error: 'File size too large. Maximum size is 10MB'
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `menu_${req.session.user.email}_${timestamp}_${randomString}.pdf`;

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(base64Data, 'base64');

        // Upload to Firebase Storage
        const { admin } = require('./config/firebase');
        const bucket = admin.storage().bucket();
        const file = bucket.file(`menus/${filename}`);

        try {
            // Upload the file
            await file.save(pdfBuffer, {
                metadata: {
                    contentType: 'application/pdf',
                    cacheControl: 'public, max-age=31536000'
                }
            });

            // Make the file publicly accessible
            await file.makePublic();

            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

            console.log(`User menu PDF uploaded successfully: ${filename}`);
            
            // Update user with menu PDF URL
            const userData = await userService.getUserByEmail(req.session.user.email);
            if (userData) {
                await userService.updateUser(userData.id, { menuPdf: publicUrl });
            }
            
            res.json({
                success: true,
                url: publicUrl,
                filename: filename
            });
        } catch (firebaseError) {
            console.error('User Firebase Storage error:', firebaseError);
            
            res.status(500).json({
                success: false,
                error: 'Failed to upload PDF to Firebase Storage',
                details: firebaseError.message
            });
        }

    } catch (error) {
        console.error('User PDF upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload PDF'
        });
    }
});

// User image upload endpoint
app.post('/user/upload-image', requireUserAuth, async (req, res) => {
    try {
        const { imageData, type } = req.body;
        
        if (!imageData || !type) {
            return res.status(400).json({
                success: false,
                error: 'Image data and type are required'
            });
        }

        // Validate image data format
        if (!imageData.startsWith('data:image/')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image format'
            });
        }

        // Extract image format and data
        const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image data format'
            });
        }

        const imageFormat = matches[1].toLowerCase();
        const base64Data = matches[2];

        // Validate image format - support PNG and other formats
        const allowedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg+xml'];
        if (!allowedFormats.includes(imageFormat)) {
            return res.status(400).json({
                success: false,
                error: `Unsupported image format. Allowed formats: ${allowedFormats.join(', ')}`
            });
        }

        // Validate file size (5MB limit)
        const fileSizeInBytes = (base64Data.length * 3) / 4;
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        
        if (fileSizeInBytes > maxSizeInBytes) {
            return res.status(400).json({
                success: false,
                error: 'File size too large. Maximum size is 5MB'
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${type}_${timestamp}_${randomString}.${imageFormat}`;

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Upload to Firebase Storage
        const { admin } = require('./config/firebase');
        const bucket = admin.storage().bucket();
        const file = bucket.file(`images/${filename}`);

        try {
            // Upload the file
            await file.save(imageBuffer, {
                metadata: {
                    contentType: `image/${imageFormat}`,
                    cacheControl: 'public, max-age=31536000'
                }
            });

            // Make the file publicly accessible
            await file.makePublic();

            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

            console.log(`User image uploaded successfully: ${filename}`);
            
            res.json({
                success: true,
                url: publicUrl,
                filename: filename
            });
        } catch (firebaseError) {
            console.error('User Firebase Storage error:', firebaseError);
            
            // If Firebase Storage fails, return a placeholder but still show success
            const placeholderSvg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="300" height="200" fill="transparent" stroke="#ddd" stroke-width="2" stroke-dasharray="5,5"/>
                <text x="150" y="100" text-anchor="middle" fill="#999" font-family="Arial" font-size="16">${type.toUpperCase()} PLACEHOLDER</text>
            </svg>`;
            const placeholderUrl = `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString('base64')}`;
            
            res.json({
                success: true,
                url: placeholderUrl,
                filename: filename,
                message: 'Firebase Storage error. Using placeholder. Please check Firebase Storage setup.',
                error: firebaseError.message
            });
        }

    } catch (error) {
        console.error('User image upload error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image'
        });
    }
});

// PDF Proxy endpoint to handle CORS issues
app.get('/api/pdf-proxy', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: 'PDF URL is required' });
        }
        
        // Validate that the URL is from Firebase Storage
        if (!url.includes('storage.googleapis.com') || !url.includes('firebasestorage.app')) {
            return res.status(400).json({ error: 'Invalid PDF URL' });
        }
        
        // Use https module to fetch the PDF
        const https = require('https');
        const { URL } = require('url');
        
        const pdfUrl = new URL(url);
        
        const options = {
            hostname: pdfUrl.hostname,
            port: pdfUrl.port || 443,
            path: pdfUrl.pathname + pdfUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Kochi-One-PDF-Proxy/1.0)'
            }
        };
        
        const request = https.request(options, (response) => {
            // Check if the response is successful
            if (response.statusCode !== 200) {
                console.error('Failed to fetch PDF:', response.statusCode, response.statusMessage);
                return res.status(response.statusCode).json({ 
                    error: `Failed to fetch PDF: ${response.statusMessage}` 
                });
            }
            
            // Set appropriate headers
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'inline',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            
            // Pipe the response to the client
            response.pipe(res);
        });
        
        request.on('error', (error) => {
            console.error('Error fetching PDF:', error);
            res.status(500).json({ error: 'Failed to fetch PDF from storage' });
        });
        
        request.end();
        
    } catch (error) {
        console.error('Error in PDF proxy:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404', { 
        title: 'Page Not Found - Kochi One',
        page: '404',
        layout: false
    });
});

// Vercel compatibility
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Kochi One website running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
