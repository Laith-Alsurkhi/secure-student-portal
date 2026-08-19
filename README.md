# 🔐 Secure Student Portal

A secure web application demonstrating Application Security best practices for an educational course. This project focuses on implementing practical security controls rather than advanced features.

## 📋 Project Description

The Secure Student Portal is a full-stack web application designed to teach Application Security fundamentals. It includes user authentication, authorization, role-based access control, input validation, and encryption of sensitive data.

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB (MongoDB Atlas) via Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Environment Variables**: dotenv

### Frontend
- **Markup**: HTML5
- **Styling**: CSS3
- **Scripting**: Vanilla JavaScript
- **Token Storage**: HttpOnly cookie

### Security Libraries
- **helmet.js**: Secure HTTP headers
- **cors**: Cross-origin resource sharing with restrictions
- **express-rate-limit**: Brute force attack prevention
- **validator**: Input validation and sanitization
- **Node crypto**: Field-level encryption

## ✨ Features

### User Features
1. **Sign Up**: Create account with name, email, student ID, phone, and password
2. **Login**: Secure authentication with email and password
3. **Dashboard**: View and update profile information
4. **Profile Management**: Edit name and phone number
5. **Session Management**: Secure logout with HttpOnly cookie cleanup

### Admin Features
1. **User Management**: View all registered users
2. **Role Management**: Change user roles between "user" and "admin"
3. **User Deletion**: Remove user accounts from the system
4. **Audit Logging**: View security events and login attempts
5. **System Monitoring**: Track all admin actions

## 🔒 Security Features Implemented

### 1. Authentication & Authorization
- **JWT Implementation**: Token-based authentication with 24-hour expiration
- HttpOnly Cookie Storage: JWT is stored in an HttpOnly cookie instead of localStorage
- SameSite Protection: SameSite=Strict is used to reduce CSRF risk
- Secure Cookie in Production: Secure flag is enabled in production over HTTPS
- **Role-Based Access Control**: Separate user and admin routes
- **Protected Routes**: All sensitive operations require valid JWT
- **Middleware Protection**: Custom auth and role middleware

### 2. Password Security
- **Bcrypt Hashing**: Passwords hashed with 10 salt rounds before storage
- **Password Validation**: Minimum 8 characters required
- **Never Plain Text**: Passwords never stored or transmitted in plain text

### 3. Input Validation & Sanitization
- **Email Validation**: RFC 5322 compliant email format checking
- **Phone Validation**: International phone number validation
- **HTML Escaping**: All user inputs escaped to prevent XSS attacks
- **Input Normalization**: Email addresses normalized for consistency

### 4. Data Protection
- **Field-Level Encryption**: Student ID and phone number encrypted with AES-256-CBC
- **Secure Headers**: Helmet.js for HTTP security headers
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Content-Security-Policy: strict-dynamic

### 5. Attack Prevention
- **Rate Limiting**:
  - Login: 5 attempts per 15 minutes
  - Signup: 10 attempts per hour
- **CORS Restrictions**: Limited to configured origin
- **User Enumeration Prevention**: Generic error messages on login failure
- NoSQL Injection Prevention: Mongoose schema validation and input sanitization
- **Cloudflare Turnstile CAPTCHA**:
  - Enabled on the Login page
  - CAPTCHA token is verified server-side before authentication

### 6. Audit & Logging
- **Security Events Logged**:
  - Login attempts (successful and failed)
  - Signup events
  - Profile updates
  - Admin actions (role changes, user deletions)
  - Audit log access
- **IP Tracking**: IP address recorded for all security events
- **Timestamp Tracking**: All events include creation timestamp

### 7. Error Handling
- **Generic Error Messages**: No sensitive information in error responses
- **No Stack Traces**: Stack traces not exposed to frontend
- **Graceful Failures**: Application continues safely on errors
- **Logging**: Detailed errors logged server-side for debugging

### 8. Environment Configuration
- **Secret Management**: JWT_SECRET and ENCRYPTION_KEY in environment
- **CAPTCHA Secret Management**: TURNSTILE_SECRET_KEY stored in environment variables
- **CORS Configuration**: Configurable allowed origin
- **Port Configuration**: Customizable server port
- **Node Environment**: Development vs production support

## 📦 Database

This project uses MongoDB (hosted on MongoDB Atlas) and the Mongoose ODM. Data is stored as documents rather than SQL tables.

### Example Mongoose Schemas
```javascript
// backend/database.js (excerpt)
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
   name: { type: String, required: true },
   email: { type: String, required: true, unique: true },
   student_id_encrypted: { type: String, required: true },
   phone_encrypted: { type: String, required: true },
   password_hash: { type: String, required: true },
   role: { type: String, enum: ['user','admin'], default: 'user' },
   created_at: { type: Date, default: Date.now }
});

const auditLogSchema = new mongoose.Schema({
   action: { type: String, required: true },
   user_email: { type: String },
   ip_address: { type: String },
   created_at: { type: Date, default: Date.now }
});
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
```

4. **Generate secure keys** (on Windows PowerShell)
```powershell
# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

5. **Update `.env` file** with generated keys and your MongoDB connection string:
```bash
PORT=5000
JWT_SECRET=your-generated-key
ENCRYPTION_KEY=your-generated-key
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
MONGODB_URI="your-mongodb-connection-string"
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

Notes:
- Use MongoDB Atlas and add your server / Render IP to Network Access (whitelist). For short-term development you may allow `0.0.0.0/0`.
- `MONGODB_URI` should be the full connection string (e.g. mongodb+srv://...)

### Frontend Setup

The frontend files are static HTML/CSS/JS and don't require a build process. They're served directly by the Express server.

## ▶️ How to Run

### Start Backend Server
```bash
cd backend
npm start
# or
npm run dev
# or
node server.js
```

The server will start at `http://localhost:5000`

### Access Frontend

Open your browser and navigate to:
- **Home**: http://localhost:5000
- **Login**: http://localhost:5000/login.html
- **Sign Up**: http://localhost:5000/signup.html

## 👤 Default Admin Account

After the server starts, a default admin account is automatically created:

- **Email**: admin@portal.com
- **Password**: Admin@12345

⚠️ **Security Note**: Change this password immediately in production!

## 📝 User Guide

### Creating an Account
1. Click "Sign Up" on the home page
2. Enter your name, email, student ID, and phone number
3. Create a strong password (min 8 characters)
4. Click "Create Account"

### Logging In
1. Click "Login" on the home page
2. Enter your email and password
3. Complete the Cloudflare Turnstile security verification
4. Click "Login"
5. You'll be redirected to your dashboard

### User Dashboard
1. View your profile information
2. Click "Edit Profile" to update your name and phone
3. Click "Logout" to exit

### Admin Dashboard (Admin Users Only)
1. Click the admin button after logging in as admin
2. View all registered users
3. Change user roles (user ↔ admin)
4. Delete users if necessary
5. View audit logs for security monitoring

## 📚 Documentation

### Threat Model
See [docs/STRIDE_Threat_Model.md](docs/STRIDE_Threat_Model.md) for detailed STRIDE threat modeling analysis including:
- Spoofing threats and mitigations
- Tampering risks and controls
- Repudiation issues
- Information Disclosure vulnerabilities
- Denial of Service considerations
- Elevation of Privilege scenarios

### Risk Assessment
See [docs/DREAD_Risk_Assessment.md](docs/DREAD_Risk_Assessment.md) for DREAD risk scoring of:
- SQL Injection attacks
- XSS vulnerabilities
- Brute Force attacks
- Session Hijacking
- Unauthorized Admin Access
- Data Leakage scenarios

## 🔍 Security Scanning

### GitHub CodeQL

1. **Enable CodeQL** on GitHub:
   - Go to repository Settings → Security & analysis
   - Enable "CodeQL" under Code security and analysis
   - Wait for initial scan to complete

2. **View Results**:
   - Go to Security → Code scanning alerts
   - Review identified vulnerabilities
   - Implement recommended fixes

### Snyk Vulnerability Scanning

1. **Install Snyk**:
```bash
npm install -g snyk
```

2. **Authenticate with Snyk**:
```bash
snyk auth
```

3. **Run Scan**:
```bash
cd backend
snyk test
```

4. **Generate Report**:
```bash
snyk test --json > security-report.json
```

5. **Save Screenshot**:
   - Take a screenshot of scan results
   - Save in `scans/` folder as `snyk-scan-{date}.png`

### Snyk Scan Results

- Initial scan: 22 issues / 78 vulnerable paths
- Final scan: 1 issue / 1 vulnerable path

Findings addressed:
- Removed unused sqlite3 dependency
- Upgraded bcrypt from 5.1.1 to 6.0.0
- Upgraded mongoose from 9.6.3 to 9.7.2

## 📁 Project Structure

```
secure-student-portal/
├── backend/
│   ├── server.js              # Main Express server
│   ├── database.js            # Database initialization
│   ├── package.json           # Dependencies
│   ├── .env.example           # Example environment config
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── role.js           # Role-based authorization
│   └── routes/
│       ├── auth.js           # Auth endpoints (signup/login)
│       ├── user.js           # User endpoints (profile)
│       └── admin.js          # Admin endpoints (user management)
│
├── frontend/
│   ├── index.html            # Home page
│   ├── login.html            # Login page
│   ├── signup.html           # Sign up page
│   ├── dashboard.html        # User dashboard
│   ├── admin.html            # Admin dashboard
│   ├── css/
│   │   └── style.css         # Global styles
│   └── js/
│       ├── auth.js           # Auth utilities
│       ├── dashboard.js      # Dashboard functionality
│       └── admin.js          # Admin functionality
│
├── docs/
│   ├── STRIDE_Threat_Model.md     # Threat modeling
│   └── DREAD_Risk_Assessment.md   # Risk assessment
│
├── scans/                     # Security scan results
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## 🔐 Security Best Practices Used

✅ **Implemented**
- ✓ Strong password hashing with bcrypt
- ✓ JWT with expiration for authentication
- ✓ Role-based access control
- ✓ Input validation and sanitization
- ✓ Environment variables for secrets
- ✓ HTTPS headers via Helmet
- ✓ CORS with restricted origins
- ✓ Rate limiting on authentication endpoints
- ✓ Field-level encryption for sensitive data
- ✓ Audit logging for security events
- ✓ Generic error messages
- ✓ Parameterized database queries
- ✓ HttpOnly cookie-based session management
- ✓ SameSite=Strict cookie protection
- ✓ Cloudflare Turnstile CAPTCHA
- ✓ Server-side CAPTCHA verification

## ⚠️ Known Limitations

This is an **educational project** and has intentional limitations:
- Single instance deployment only
- No database backup mechanism
- No API rate limiting on other endpoints
- No email verification
- Simplified encryption key rotation
- No multi-factor authentication
- No password reset mechanism

## 📝 Code Quality

All code includes:
- Inline security comments explaining security measures
- Input validation and error handling
- Proper error messages without information disclosure
- Clear naming conventions
- Organized file structure

## 🎓 Learning Outcomes

After working through this project, students will understand:
- JWT-based authentication mechanisms
- Password hashing and bcrypt usage
- Role-based access control (RBAC)
- Input validation and sanitization techniques
- Field-level encryption for sensitive data
- Security headers and their purposes
- Rate limiting for attack prevention
- Audit logging for compliance
- STRIDE threat modeling methodology
- DREAD risk assessment methodology

## 📄 License

This project is provided for educational purposes.

## 🤝 Submission Notes (For GitHub)

When submitting this project:

1. **Include all files** in the repository:
   - Backend code with node_modules in .gitignore
   - Frontend files
   - Documentation
   - Security scan results in scans/ folder

2. **Verify Setup Instructions**:
   - Test backend startup
   - Confirm default admin account creation
   - Test all user flows

3. **Include Security Scans**:
   - GitHub CodeQL scan results
   - Snyk vulnerability scan output
   - Screenshots in scans/ folder

4. **Documentation Checklist**:
   - ✓ README with setup instructions
   - ✓ STRIDE threat model analysis
   - ✓ DREAD risk assessment

5. **Code Quality**:
   - ✓ Security comments explaining each protection
   - ✓ Proper error handling
   - ✓ Input validation on all endpoints
   - ✓ No hardcoded secrets

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env file or kill process on port 5000
# Windows: taskkill /PID <PID> /F
```

### MongoDB Connection Issues

- Ensure MongoDB Atlas IP whitelist allows your IP
- Verify MONGODB_URI is correct in .env
- Check internet connection

### Token Expiration
- JWT session cookie expires after 24 hours
- Users need to login again after session expiration
- A new JWT is generated and stored in an HttpOnly cookie after successful login

### CORS Errors
- Check CORS_ORIGIN in .env matches frontend URL
- Default is http://localhost:3000
- For local testing, use http://localhost:5000

---

**Built with ❤️ for Application Security Education**
