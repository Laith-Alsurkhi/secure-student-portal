# STRIDE Threat Model - Secure Student Portal

## Overview
STRIDE is a threat modeling framework that categorizes security threats into six categories: **Spoofing**, **Tampering**, **Repudiation**, **Information Disclosure**, **Denial of Service**, and **Elevation of Privilege**.

This document analyzes potential threats to the Secure Student Portal application and the mitigations implemented.

---

## 1. SPOOFING - Identity Spoofing

### Threat Description
An attacker impersonates a legitimate user by forging their identity to gain unauthorized access to the system.

### Examples in This Application
- **Email Spoofing**: Attacker registers with someone else's email address
- **JWT Token Spoofing**: Attacker creates a forged JWT token to impersonate another user
- **Session Hijacking**: Attacker intercepts and reuses another user's JWT token

### Potential Impact
- **High**: Unauthorized access to victim's profile and data
- **Medium**: Access to shared resources and data
- **Low**: Information gathering about other users

### Implemented Mitigations

#### Email Validation & Uniqueness
```javascript
// Email format validation using validator library
if (!validator.isEmail(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}

// Unique email constraint in database
UNIQUE NOT NULL on email column
```

#### JWT Signature Verification
```javascript
// JWT verified with secret key
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Only valid tokens with correct signature are accepted
// Token tampering will fail verification
```

#### Token Expiration
```javascript
// Tokens expire after 24 hours
jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);
```

#### HTTPS Headers via Helmet
```javascript
// Helmet sets X-Frame-Options to prevent clickjacking
// Prevents embedding app in malicious frames for credential theft
app.use(helmet());
```

#### Audit Logging
```javascript
// Log all login attempts (success and failure)
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  ['login', email, ip_address]
);
```

---

## 2. TAMPERING - Data Tampering

### Threat Description
An attacker modifies data in transit or at rest to compromise data integrity. This includes modifying user accounts, passwords, roles, or communications.

### Examples in This Application
- **JWT Tampering**: Attacker modifies token payload to elevate privileges
- **Database Tampering**: Direct modification of user role or password
- **Form Tampering**: Client-side modification of form data
- **SQL Injection**: Malicious SQL in user input to modify data

### Potential Impact
- **Critical**: Privilege escalation to admin
- **High**: Modification of other users' data
- **Medium**: Modification of own profile incorrectly
- **Low**: Data inconsistency

### Implemented Mitigations

#### JWT Signature Protection
```javascript
// JWT tokens are cryptographically signed
// Any modification to payload invalidates the signature
jwt.verify(token, process.env.JWT_SECRET);
// Tampering detected and token rejected
```

#### Parameterized Queries
```javascript
// All database queries use parameterized statements
db.run(
  `UPDATE users SET role = ? WHERE id = ?`,
  [role, userId]
  // User input never directly concatenated into SQL
);
```

#### Input Validation
```javascript
// All inputs validated before database operation
if (!validator.isEmail(email)) return error;
if (!validator.isLength(password, { min: 8 })) return error;
if (!validator.isMobilePhone(phone)) return error;
```

#### Role Verification on Server
```javascript
// Role changes verified server-side, not based on client input
const decoded = jwt.verify(token, process.env.JWT_SECRET);
if (decoded.role !== 'admin') return 403;
```

#### HTTPS Headers
```javascript
// Content-Security-Policy prevents inline script injection
// X-Content-Type-Options: nosniff prevents MIME type sniffing
app.use(helmet());
```

#### Audit Logging
```javascript
// All admin actions logged with who, what, when, where
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  [`change_role_for_${targetUser}`, adminEmail, ipAddress]
);
```

---

## 3. REPUDIATION - Non-Repudiation

### Threat Description
A user denies performing an action because there's no proof of their involvement. An attacker performs actions and claims someone else did it.

### Examples in This Application
- **Admin Denies Deletion**: Admin claims they didn't delete a user
- **User Denies Changes**: User claims they didn't modify their profile
- **Unauthorized Access Denial**: Admin denies accessing audit logs

### Potential Impact
- **Medium**: Inability to hold users accountable
- **Low**: Compliance and audit trail gaps

### Implemented Mitigations

#### Comprehensive Audit Logging
```javascript
// All security-relevant actions are logged
// Includes: signup, login, failed login, profile update, role changes, deletions
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address, created_at) 
   VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
  [action, email, ip_address]
);
```

#### Timestamping
```sql
-- All audit logs include creation timestamp
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### IP Address Tracking
```javascript
// IP address recorded for all security events
const userIp = req.ip || req.connection.remoteAddress;
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  [action, email, userIp]
);
```

#### User Identification
```javascript
// All actions linked to authenticated user's email
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  [action, req.user.email, req.ip]
);
```

#### Admin-Only Audit Access
```javascript
// Only admins can view audit logs
router.get('/audit-logs', authMiddleware, roleMiddleware('admin'), (req, res) => {
  // Audit logs only accessible to admins
});
```

---

## 4. INFORMATION DISCLOSURE - Data Leakage

### Threat Description
Sensitive information is exposed to unauthorized parties, including personal data, credentials, or system information.

### Examples in This Application
- **Password Exposure**: Plain text passwords stored or transmitted
- **Sensitive Field Exposure**: Student ID or phone visible in transit
- **Error Message Leakage**: Stack traces revealing system details
- **Encryption Key Exposure**: Hardcoded keys visible in code
- **Token Leakage**: JWT tokens exposed in logs or error messages

### Potential Impact
- **Critical**: Password exposure compromises accounts
- **High**: Encryption key exposure compromises encrypted data
- **Medium**: Sensitive field exposure violates privacy
- **Low**: System information used for targeted attacks

### Implemented Mitigations

#### Password Hashing
```javascript
// Passwords never stored in plain text
// Bcrypt with 10 salt rounds: computationally expensive to crack
const passwordHash = await bcrypt.hash(password, 10);
// Only hash stored in database
db.run('INSERT INTO users ... password_hash ...', [passwordHash]);
```

#### Field Encryption
```javascript
// Student ID and phone encrypted with AES-256-CBC
const encryptedStudentId = encryptField(studentId);
const encryptedPhone = encryptField(phone);

// Only encrypted values stored in database
db.run(
  `INSERT INTO users (student_id_encrypted, phone_encrypted) VALUES (?, ?)`,
  [encryptedStudentId, encryptedPhone]
);

// Decrypted only when needed, in memory
const decrypted = decryptField(user.student_id_encrypted);
```

#### Environment Variables
```javascript
// Secrets stored in environment variables
require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET;
const encryptionKey = process.env.ENCRYPTION_KEY;

// Never hardcoded in source code
```

#### Generic Error Messages
```javascript
// No sensitive information in error responses
if (!user || !(await bcrypt.compare(password, user.password_hash))) {
  // Generic message - doesn't reveal if email exists
  return res.status(401).json({ error: 'Invalid email or password' });
}
```

#### HTTPS Headers
```javascript
// Helmet sets security headers
app.use(helmet());
// Includes:
// - X-Frame-Options: DENY (prevents clickjacking)
// - X-Content-Type-Options: nosniff (prevents MIME sniffing)
// - Content-Security-Policy (prevents XSS)
// - Strict-Transport-Security (enforces HTTPS)
```

#### Input Sanitization
```javascript
// HTML escaping prevents XSS attacks
const sanitizedName = validator.escape(name);
const sanitizedEmail = validator.normalizeEmail(email);

// User input escaped before database storage
db.run(
  `INSERT INTO users (name, email) VALUES (?, ?)`,
  [sanitizedName, sanitizedEmail]
);
```

#### Token Handling
```javascript
// Tokens stored in localStorage (only accessible via JavaScript)
localStorage.setItem('token', data.token);

// Tokens transmitted in Authorization header
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

## 5. DENIAL OF SERVICE (DoS) - Service Availability

### Threat Description
An attacker disrupts service availability by overwhelming the system with requests or exploiting resource exhaustion.

### Examples in This Application
- **Brute Force Attacks**: Repeated login attempts to guess passwords
- **Resource Exhaustion**: Large file uploads consuming server memory
- **Database Flooding**: Excessive database queries
- **Signup Abuse**: Rapid account creation consuming storage

### Potential Impact
- **High**: Service unavailability for legitimate users
- **Medium**: System slowdown affecting performance
- **Low**: Minor interruptions in service

### Implemented Mitigations

#### Rate Limiting
```javascript
// Rate limiting on login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                    // Max 5 attempts
  message: 'Too many login attempts, try again later'
});
router.post('/login', loginLimiter, async (req, res) => {...});

// Rate limiting on signup endpoint
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                   // Max 10 attempts
  message: 'Too many signup attempts, try again later'
});
router.post('/signup', signupLimiter, async (req, res) => {...});
```

#### Request Size Limiting
```javascript
// Limit request body size
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

#### Database Query Optimization
```javascript
// Limit audit log retrieval to prevent data scanning
db.all(
  `SELECT ... FROM audit_logs ORDER BY created_at DESC LIMIT 100`,
  // Only return last 100 records, not all records
);
```

#### Connection Timeouts
```javascript
// Express handles connection timeouts
// Prevents resource exhaustion from slow clients
```

#### Input Validation
```javascript
// Validate input before processing
if (!name || !email || !password) return error;
// Prevents processing of malformed requests
```

---

## 6. ELEVATION OF PRIVILEGE - Access Control

### Threat Description
An attacker gains higher access privileges than intended, especially escalating from regular user to admin.

### Examples in This Application
- **JWT Payload Modification**: Change role in token from "user" to "admin"
- **Direct Database Access**: Direct SQL query to change role
- **Admin Endpoint Access**: Regular user accessing admin endpoints
- **Role Bypass**: Exploiting logic gaps to gain admin access

### Potential Impact
- **Critical**: Full system compromise with admin access
- **High**: Access to all user data and admin functions
- **Medium**: Modification of other users' accounts

### Implemented Mitigations

#### JWT Signature Verification
```javascript
// JWT signature prevents payload modification
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Any change to payload invalidates signature
// Token rejected if tampered with
```

#### Server-Side Role Verification
```javascript
// Role verified server-side from token, not client
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
// Never trust client claims about role
```

#### Role Middleware Protection
```javascript
// Custom middleware enforces role requirements
const roleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// Admin endpoints protected
router.get('/users', authMiddleware, roleMiddleware('admin'), ...);
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), ...);
```

#### Parameterized Queries
```javascript
// Prevent SQL injection that could bypass role checks
db.run(
  `UPDATE users SET role = ? WHERE id = ?`,
  [role, userId]
  // Input parameters safely escaped
);
```

#### Self-Protection
```javascript
// Prevent admin from demoting themselves
if (req.user.id == userId && role !== 'admin') {
  return res.status(400).json({ error: 'Cannot demote yourself' });
}
```

#### Audit Logging of Privilege Changes
```javascript
// Log all role modifications
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  [`change_role_for_${targetUserEmail}`, adminEmail, ipAddress]
);
```

#### Environment Validation
```javascript
// Validate JWT_SECRET exists (critical for token security)
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET not set');
  process.exit(1);
}
```

---

## Summary Table

| Threat Category | Risk Level | Primary Mitigation | Secondary Mitigations |
|---|---|---|---|
| **Spoofing** | High | JWT Signature Verification | Email validation, Token expiration, Audit logging |
| **Tampering** | Critical | Parameterized Queries | JWT signature, Input validation, Role verification |
| **Repudiation** | Medium | Audit Logging | Timestamping, IP tracking, User identification |
| **Information Disclosure** | High | Field Encryption | Password hashing, Generic errors, Environment variables |
| **Denial of Service** | Medium | Rate Limiting | Request size limits, Query limits, Input validation |
| **Elevation of Privilege** | Critical | Role Middleware | JWT verification, Self-protection, Audit logging |

---

## Defense in Depth Strategy

The application implements **layered security** (defense in depth):

1. **First Layer**: Input Validation
   - Type checking, format validation, length limits

2. **Second Layer**: Application Logic
   - Role verification, parameterized queries, error handling

3. **Third Layer**: Cryptography
   - Password hashing, field encryption, JWT signing

4. **Fourth Layer**: Monitoring
   - Audit logging, rate limiting, anomaly detection

5. **Fifth Layer**: HTTP Security
   - Helmet headers, CORS restrictions, HTTPS enforcement

No single layer is 100% effective. Multiple overlapping protections ensure that compromise of one layer doesn't fully expose the system.

---

## Continuous Improvement

- Regularly review STRIDE analysis as features are added
- Update mitigations based on security scanning results (GitHub CodeQL, Snyk)
- Monitor audit logs for suspicious patterns
- Keep dependencies updated for security patches
- Conduct regular security reviews

---

**Last Updated**: 2024
**Application**: Secure Student Portal
**Purpose**: Educational Security Demonstration
