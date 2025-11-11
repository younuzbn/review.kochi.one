const { admin } = require('../config/firebase');

// Helper function to check if an email is an admin email (case-insensitive)
const isAdminEmail = (email) => {
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) : [];
  return adminEmails.includes(email.toLowerCase());
};

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if the email is one of the admin emails
    if (!isAdminEmail(decodedToken.email)) {
      return res.status(403).json({ error: 'Access denied. Admin email required.' });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user is authenticated via session
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    // Check if this is a user route or admin route
    if (req.path.startsWith('/user/')) {
      return res.redirect('/user/login');
    } else {
      return res.redirect('/admin/login');
    }
  }
};

// Middleware to require admin authentication
const requireAdminAuth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    return res.redirect('/admin/login');
  }
};

// Middleware to require user authentication
const requireUserAuth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'user') {
    return next();
  } else {
    return res.redirect('/user/login');
  }
};

// Middleware to check if user is already logged in (admin)
const redirectIfAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  } else {
    return next();
  }
};

// Middleware to check if user is already logged in (user)
const redirectIfUserAuthenticated = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'user') {
    return res.redirect('/user/dashboard');
  } else {
    return next();
  }
};

// Middleware to check if user is already logged in (any role)
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    } else if (req.session.user.role === 'user') {
      return res.redirect('/user/dashboard');
    }
  }
  return next();
};

module.exports = {
  verifyToken,
  requireAuth,
  requireAdminAuth,
  requireUserAuth,
  redirectIfAuthenticated,
  redirectIfAdminAuthenticated,
  redirectIfUserAuthenticated
};
