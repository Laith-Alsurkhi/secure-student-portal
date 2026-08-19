# DREAD Risk Assessment - Secure Student Portal

## Overview
DREAD is a risk rating methodology that categorizes and scores security vulnerabilities based on:
- **D**amage: How severe are the consequences?
- **R**eproducibility: How easy is it to reproduce the attack?
- **E**xploitability: How easy is it to execute the attack?
- **A**ffected Users: What percentage of users are affected?
- **D**iscoverability: How easy is it to discover the vulnerability?

Each factor is scored 0-10, then averaged to get the total DREAD score.

**Risk Level Classification**:
- **8.0-10.0**: Critical - Requires immediate remediation
- **6.0-7.9**: High - Should be fixed soon
- **4.0-5.9**: Medium - Should be addressed in planning
- **2.0-3.9**: Low - Can be deferred or accepted
- **0.0-1.9**: Very Low - Minimal concern

---

## 1. SQL Injection Attack

### Description
An attacker injects malicious SQL code into user input fields to manipulate database queries and access/modify unauthorized data.

### Example Attack Scenarios
- **Email Field**: `admin' OR '1'='1`
- **Name Field**: `'; DROP TABLE users; --`
- **Login Form**: Email: `' OR '1'='1` Password: `anything`

### DREAD Scoring

| Factor | Score | Justification |
|---|---|---|
| **Damage** | 10 | Complete database compromise possible - access all user data, admin accounts, ability to delete/modify records |
| **Reproducibility** | 2 | Very difficult to exploit due to parameterized queries - would require bypassing multiple safety measures |
| **Exploitability** | 1 | All database queries use parameterized statements - SQL injection nearly impossible |
| **Affected Users** | 10 | If successful, would affect ALL users and system data |
| **Discoverability** | 3 | Standard SQL injection attempts easily caught by logging and monitoring |

### DREAD Score Calculation
`(10 + 2 + 1 + 10 + 3) / 5 = 5.2` → **MEDIUM RISK**

### Mitigation Implementation

#### Parameterized Queries
```javascript
// ✓ SAFE: Using parameterized statements
db.run(
  `SELECT * FROM users WHERE email = ? AND password_hash = ?`,
  [email, passwordHash],
  callback
);

// ✗ UNSAFE: String concatenation (NOT used in this app)
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

#### Input Validation
```javascript
// Validate email format before database query
if (!validator.isEmail(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
```

#### Prepared Statements
```javascript
// SQLite3 prepared statements prevent injection
db.run(
  `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
  [name, email, passwordHash]
  // User input never directly in SQL
);
```

### Residual Risk
**Low** - Parameterized queries make SQL injection extremely difficult. The only vulnerability would be in SQLite3 library itself.

---

## 2. Cross-Site Scripting (XSS) Attack

### Description
An attacker injects malicious JavaScript code into the application that executes in victim's browsers, stealing cookies, credentials, or performing unauthorized actions.

### Example Attack Scenarios
- **Stored XSS**: `<script>alert('XSS')</script>` stored in name field, executed for all users
- **Reflected XSS**: Link with payload: `?name=<img src=x onerror="alert('XSS')">`
- **DOM XSS**: JavaScript modifying DOM with user input

### DREAD Scoring

| Factor | Score | Justification |
|---|---|---|
| **Damage** | 9 | Attacker can steal JWT tokens, perform actions as user, redirect to phishing pages, steal credentials |
| **Reproducibility** | 3 | Difficult to exploit - HTML escaping and Content-Security-Policy implemented |
| **Exploitability** | 2 | Input is escaped before storage and display; CSP limits inline scripts |
| **Affected Users** | 8 | If XSS stored in popular content, many users could be affected |
| **Discoverability** | 5 | Script tags would appear in source - moderately easy to discover during testing |

### DREAD Score Calculation
`(9 + 3 + 2 + 8 + 5) / 5 = 5.4` → **MEDIUM RISK**

### Mitigation Implementation

#### HTML Escaping
```javascript
// ✓ SAFE: Using validator.escape()
const sanitizedName = validator.escape(name);
// <script> becomes &lt;script&gt;

db.run(
  `INSERT INTO users (name) VALUES (?)`,
  [sanitizedName]
);
```

#### Frontend Output Escaping
```javascript
// ✓ SAFE: Using textContent instead of innerHTML
document.getElementById('displayName').textContent = userData.name;
// textContent treats value as text, not HTML

// ✗ UNSAFE: Using innerHTML
document.getElementById('displayName').innerHTML = userData.name;
```

#### Content Security Policy (Helmet)
```javascript
// Helmet sets CSP header
app.use(helmet());
// Blocks inline scripts: <script>alert('XSS')</script>
// Allows only whitelisted script sources
```

#### Input Validation
```javascript
// Validate name length and type
if (!validator.isLength(name, { min: 1, max: 100 })) {
  return res.status(400).json({ error: 'Invalid name length' });
}
```

### Residual Risk
**Low** - Multiple layers of protection (HTML escaping, CSP, textContent) make XSS unlikely.

---

## 3. Brute Force Login Attack

### Description
An attacker attempts to gain unauthorized access by trying many password combinations rapidly, exploiting weak passwords or lack of account lockout.

### Example Attack Scenarios
- **Rapid Login Attempts**: 100 requests per second trying common passwords
- **Dictionary Attack**: Testing against list of common passwords
- **Credential Stuffing**: Testing breached credentials from other services

### DREAD Scoring

| Factor | Score | Justification |
|---|---|---|
| **Damage** | 10 | Successful login grants full user account access including personal data |
| **Reproducibility** | 9 | Easy to automate - simple HTTP POST requests |
| **Exploitability** | 2 | Rate limiting severely restricts attack attempts |
| **Affected Users** | 8 | Attack targets specific users but could affect many accounts over time |
| **Discoverability** | 9 | Brute force attempts easily detected and logged |

### DREAD Score Calculation
`(10 + 9 + 2 + 8 + 9) / 5 = 7.6` → **HIGH RISK** (without mitigation)

### Mitigation Implementation

#### Rate Limiting
```javascript
// Login rate limiting: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // Max 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, async (req, res) => {
  // Only 5 login attempts allowed per IP per 15 minutes
});
```

#### Signup Rate Limiting
```javascript
// Signup rate limiting: 10 attempts per hour
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                    // Max 10 attempts
});

router.post('/signup', signupLimiter, async (req, res) => {...});
```

#### Strong Password Requirements
```javascript
// Enforce minimum password length
if (!validator.isLength(password, { min: 8 })) {
  return res.status(400).json({ error: 'Password must be at least 8 characters' });
}
```

#### Secure Password Storage
```javascript
// Bcrypt with 10 rounds (computationally expensive)
const passwordHash = await bcrypt.hash(password, 10);
// Each attempt takes ~100ms, making brute force impractical
```

#### Audit Logging
```javascript
// Log all login attempts
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  ['login' or 'failed_login', email, ipAddress]
);
// Enables detection of brute force patterns
```

#### Generic Error Messages
```javascript
// Prevent user enumeration
if (!user || !(await bcrypt.compare(password, user.password_hash))) {
  return res.status(401).json({ error: 'Invalid email or password' });
  // Doesn't reveal if email exists
}
```

### With Mitigations: DREAD Score
`(10 + 9 + 1 + 8 + 9) / 5 = 7.4` → **HIGH RISK** (still notable threat)

### Residual Risk
**Medium** - Rate limiting effective but sophisticated attacks (distributed IPs, weak passwords) could still succeed. Recommend:
- Monitor audit logs for suspicious patterns
- Alert on repeated failed logins
- Consider CAPTCHA after failed attempts

---

## 4. Session Hijacking / Token Theft

### Description
An attacker steals or intercepts a user's JWT token to impersonate them without knowing the password.

### Example Attack Scenarios
- **Network Sniffing**: Intercepting unencrypted HTTP traffic
- **localStorage Theft**: XSS attack to steal token from localStorage
- **MITM Attack**: Man-in-the-middle intercepting token
- **Token Replay**: Reusing stolen token after capture

### DREAD Scoring

| Factor | Score | Justification |
|---|---|---|
| **Damage** | 9 | Attacker gains full session access - can view/modify data as authenticated user |
| **Reproducibility** | 4 | Requires either network access or successful XSS attack |
| **Exploitability** | 3 | Tokens expire in 24 hours - limited window; XSS mitigations make token theft difficult |
| **Affected Users** | 3 | Targets specific authenticated users, not random users |
| **Discoverability** | 6 | Token theft could go undetected if attacker is careful |

### DREAD Score Calculation
`(9 + 4 + 3 + 3 + 6) / 5 = 5.0` → **MEDIUM RISK**

### Mitigation Implementation

#### Token Expiration
```javascript
// Tokens expire after 24 hours
jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }  // Limited validity window
);
```

#### JWT Signature Verification
```javascript
// Token verified with secret key
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Tampering/replay detected immediately
```

#### Secure Storage
```javascript
// Token stored in localStorage (accessible to JavaScript only)
localStorage.setItem('token', data.token);
// Not transmitted in cookies (subject to CSRF)
```

#### HTTPS Headers (via Helmet)
```javascript
// Strict-Transport-Security header forces HTTPS
app.use(helmet());
// Prevents man-in-the-middle attacks on HTTPS

// X-Frame-Options: DENY prevents clickjacking
// Reduces risk of malicious frame tricking users
```

#### XSS Protection
```javascript
// Input escaping prevents XSS that could steal token
const sanitizedName = validator.escape(name);

// Content-Security-Policy prevents inline scripts
app.use(helmet());
```

#### Audit Logging
```javascript
// Log all authentication events
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  ['login', email, ipAddress]
);
// Suspicious authentication patterns can be detected
```

### Residual Risk
**Low-Medium** - Multiple protections but requires HTTPS to be fully effective. Users should:
- Use HTTPS exclusively
- Not access on untrusted networks
- Logout when done (clears localStorage)

---

## 5. Unauthorized Admin Access

### Description
An unprivileged user or attacker gains admin privileges and accesses admin functions like user management and audit logs.

### Example Attack Scenarios
- **Token Forgery**: Create JWT with role: "admin"
- **Role Escalation**: Modify token payload to change role
- **Direct Database Access**: Bypass application to directly modify database
- **Endpoint Access**: Send requests to admin endpoints
- **Default Credentials**: Using unchanged default admin password

### DREAD Scoring

| Factor | Score | Justification |
|---|---|---|
| **Damage** | 10 | Complete system compromise - full access to all user data and functions |
| **Reproducibility** | 2 | Difficult - multiple security layers prevent privilege escalation |
| **Exploitability** | 1 | JWT signature verification makes token forgery impossible; role middleware enforces checks |
| **Affected Users** | 10 | Would affect entire system and all users |
| **Discoverability** | 5 | Unauthorized admin access would be logged and potentially detected |

### DREAD Score Calculation
`(10 + 2 + 1 + 10 + 5) / 5 = 5.6` → **MEDIUM RISK**

### Mitigation Implementation

#### JWT Signature Verification
```javascript
// Role extracted from signed JWT - cannot be forged
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
// Token tampering invalidates signature
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
router.get('/admin/users', authMiddleware, roleMiddleware('admin'), ...);
router.delete('/admin/users/:id', authMiddleware, roleMiddleware('admin'), ...);
```

#### Server-Side Authorization
```javascript
// Role verified server-side, never trusts client
// Client-side role display doesn't grant access
```

#### Parameterized Queries
```javascript
// Prevent SQL injection to bypass role checks
db.run(
  `UPDATE users SET role = ? WHERE id = ?`,
  [role, userId]
);
```

#### Default Admin Change
```javascript
// Default admin account created automatically but can be changed
// Should change password immediately in production:
// Email: admin@portal.com (default)
// Password: Admin@12345 (should be changed)
```

#### Audit Logging
```javascript
// All admin actions logged with identity
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  [`delete_user_${targetEmail}`, adminEmail, ipAddress]
);
// Unauthorized admin access would be detected
```

#### Self-Protection
```javascript
// Prevent admin from accidentally demoting themselves
if (req.user.id == userId && newRole !== 'admin') {
  return res.status(400).json({ error: 'Cannot demote yourself' });
}
```

### Residual Risk
**Low** - Multiple overlapping protections make unauthorized admin access very difficult.

---

## 6. Data Leakage / Information Disclosure

### Description
Sensitive user information (passwords, personal data, encryption keys) is exposed to unauthorized parties.

### Example Attack Scenarios
- **Password in Logs**: Plaintext passwords in server logs
- **Unencrypted Fields**: Student ID and phone visible in database
- **Error Messages**: Stack traces revealing system architecture
- **Source Code Exposure**: Hardcoded secrets in GitHub
- **Network Sniffing**: Unencrypted communication

### DREAD Scoring

| Factor | Score | Justification |
|---|---|---|
| **Damage** | 10 | Exposure of passwords enables account takeover; personal data violates privacy |
| **Reproducibility** | 4 | Requires either code access or database breach |
| **Exploitability** | 2 | Passwords hashed; sensitive fields encrypted; secrets in environment variables |
| **Affected Users** | 9 | If database breached, potentially all users affected |
| **Discoverability** | 4 | Code review or database inspection would reveal controls |

### DREAD Score Calculation
`(10 + 4 + 2 + 9 + 4) / 5 = 5.8` → **MEDIUM RISK**

### Mitigation Implementation

#### Password Hashing
```javascript
// Passwords never stored in plaintext
const passwordHash = await bcrypt.hash(password, 10);
// Only bcrypt hash stored in database

// Passwords never transmitted in plaintext
// Transmitted over HTTPS in request bodies
```

#### Field-Level Encryption
```javascript
// Sensitive fields encrypted before storage
const encryptedStudentId = encryptField(studentId);
const encryptedPhone = encryptField(phone);

// Only encrypted values stored in database
db.run(
  `INSERT INTO users (student_id_encrypted, phone_encrypted) VALUES (?, ?)`,
  [encryptedStudentId, encryptedPhone]
);

// Decrypted in memory only when needed
const decrypted = decryptField(user.student_id_encrypted);
```

#### Environment Variables
```javascript
// Secrets stored in .env file (not version controlled)
require('dotenv').config();
const jwtSecret = process.env.JWT_SECRET;
const encryptionKey = process.env.ENCRYPTION_KEY;

// Never hardcoded in source files
// .gitignore prevents .env from being committed
```

#### Generic Error Messages
```javascript
// No sensitive information in error responses
catch (error) {
  console.error('Database error:', error);  // Logged server-side
  return res.status(500).json({
    error: 'Database error occurred'  // Generic to frontend
  });
}
```

#### HTTPS Headers
```javascript
// Helmet sets security headers
app.use(helmet());
// Content-Security-Policy prevents external resource loading
// Strict-Transport-Security enforces HTTPS
```

#### .gitignore Protection
```
# Prevent accidental secret leakage
.env
node_modules/
database.sqlite
```

#### No Sensitive Logging
```javascript
// Authentication logging includes only email and action
db.run(
  `INSERT INTO audit_logs (action, user_email, ip_address) VALUES (?, ?, ?)`,
  ['login', email, ipAddress]
  // Password, token, or other secrets NOT logged
);
```

### Residual Risk
**Medium** - Strong controls but database breach would expose encrypted data. Recommendations:
- Regularly rotate encryption keys
- Monitor database access
- Use HTTPS exclusively
- Implement database backups with encryption

---

## Summary Risk Matrix

| Vulnerability | DREAD Score | Risk Level | Status |
|---|---|---|---|
| SQL Injection | 5.2 | Medium | ✓ Well Mitigated |
| XSS Attack | 5.4 | Medium | ✓ Well Mitigated |
| Brute Force Login | 7.6 → 7.4 | High | ✓ Mitigated |
| Session Hijacking | 5.0 | Medium | ✓ Well Mitigated |
| Unauthorized Admin | 5.6 | Medium | ✓ Well Mitigated |
| Data Leakage | 5.8 | Medium | ✓ Mitigated |

### Overall Security Posture: **GOOD** ✓

The application implements **defense in depth** across all identified risk areas. While no system is 100% secure, the multiple overlapping protections significantly reduce the feasibility of successful attacks.

---

## Risk Management Recommendations

### Short Term (Implement Immediately)
- ✓ All mitigations already implemented
- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET and ENCRYPTION_KEY

### Medium Term (Next Sprint)
- [ ] Implement CAPTCHA after failed login attempts
- [ ] Add email verification for new accounts
- [ ] Implement password reset mechanism
- [ ] Add two-factor authentication (2FA)

### Long Term (Future Versions)
- [ ] Implement OAuth for external authentication
- [ ] Add encryption key rotation mechanism
- [ ] Implement database access audit logging
- [ ] Add intrusion detection system (IDS)
- [ ] Conduct third-party security audit

### Continuous
- [ ] Keep dependencies updated
- [ ] Monitor security advisories
- [ ] Review audit logs regularly
- [ ] Run periodic security scans (GitHub CodeQL, Snyk)
- [ ] Conduct quarterly security reviews

---

## Conclusion

The Secure Student Portal demonstrates practical implementation of security best practices across multiple threat vectors. While the application is designed for educational purposes and should not be used in production for real student data, it effectively illustrates secure coding principles and risk mitigation strategies.

The combination of:
- Input validation and sanitization
- Parameterized queries
- Bcrypt password hashing
- JWT token verification
- Field-level encryption
- Rate limiting
- Role-based access control
- Comprehensive audit logging

...creates a robust defense against common web application vulnerabilities.

---

**Last Updated**: 2024
**Application**: Secure Student Portal
**Purpose**: Educational Security Demonstration
