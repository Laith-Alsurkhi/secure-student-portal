// Security: Express Server Setup
// Main application entry point with comprehensive security configuration

require('dotenv').config(); // Load environment variables
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');

// Import database and routes
const db = require('./database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.'
  }
});

// Security: Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set in .env file');
  process.exit(1);
}

if (!process.env.ENCRYPTION_KEY) {
  console.warn('WARNING: ENCRYPTION_KEY not set in .env, using default insecure key');
}
const {
  generateCsrfToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,

  getSessionIdentifier: (req) => {
    return req.cookies?.auth_token || 'anonymous';
  },

  cookieName: 'x-csrf-token',

  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  },

  getCsrfTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  }
});
// Security: Helmet middleware - Sets secure HTTP headers
// Allow unsafe-inline for development
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'","'unsafe-inline'","https://challenges.cloudflare.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        frameSrc: ["'self'","https://challenges.cloudflare.com"],
        connectSrc: ["'self'","https://challenges.cloudflare.com"
],
      },
    },
  })
);

// Security: CORS middleware - Restrict origins
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Set in .env
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
allowedHeaders: ['Content-Type','Authorization','x-csrf-token']})
);

// Security: Body parser middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Security: CSRF token bootstrap endpoint
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// Security: Enforce CSRF protection on state-changing requests
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  return doubleCsrfProtection(req, res, next);
});

// Security: Serve frontend files (Simple static file serving)
app.use(express.static(path.join(__dirname, '../frontend')));

// Security: Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Security: General API rate limiting
app.use('/api', apiLimiter);

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res);

  res.json({
    csrfToken
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', doubleCsrfProtection, userRoutes);
app.use('/api/admin', doubleCsrfProtection, adminRoutes);


// Home route - serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Security: 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Security: Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  // Security: Don't expose stack traces or sensitive info
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║     🔐 Secure Student Portal - Application Security         ║
  ║                                                              ║
  ║     Server running at http://localhost:${PORT}                       ║
  ║                                                              ║
  ║     Frontend: http://localhost:${PORT}                              ║
  ║                                                              ║
  ║     Default Admin:                                           ║
  ║     Email: admin@portal.com                                  ║
  ║     Password: Admin@12345                                    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await require('mongoose').connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});
