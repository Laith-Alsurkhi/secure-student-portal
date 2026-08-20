// Security: Authentication Routes with MongoDB

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');

const { User, AuditLog } = require('../database');


function hashStudentId(studentId) {
  return crypto
    .createHash('sha256')
    .update(studentId.trim())
    .digest('hex');
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many signup attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const encryptField = (plainText) => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};
const verifyTurnstile = async (token, remoteIp) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('TURNSTILE_SECRET_KEY is not configured');
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);

  if (remoteIp) {
    formData.append('remoteip', remoteIp);
  }

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error('Turnstile verification service error');
  }

  return await response.json();
};

// Signup
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { name, email, studentId, phone, password } = req.body;

    if (!name || !email || !studentId || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!/^\d{9}$/.test(studentId)) {
      return res.status(400).json({
        error: 'Student ID must be exactly 9 digits'
      });
    }

    if (!validator.isLength(password, { min: 8 })) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!/^07[789]\d{7}$/.test(phone)) {
      return res.status(400).json({
        error: 'Phone number must be a valid Jordanian number with 10 digits'
      });
    }

    const sanitizedName = validator.escape(name);
    const sanitizedEmail = validator.normalizeEmail(email);

    const existingUser = await User.findOne({ email: sanitizedEmail });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const studentIdHash = hashStudentId(studentId);

    const existingStudent = await User.findOne({
      student_id_hash: studentIdHash
    });

    if (existingStudent) {
      return res.status(409).json({
        error: 'Student ID already registered'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const encryptedStudentId = encryptField(validator.escape(studentId));
    const encryptedPhone = encryptField(validator.escape(phone));

    await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      student_id_encrypted: encryptedStudentId,
      phone_encrypted: encryptedPhone,
      password_hash: passwordHash,
      student_id_hash: studentIdHash,
      role: 'user'
    });

    await AuditLog.create({
      action: 'signup',
      user_email: sanitizedEmail,
      ip_address: req.ip
    });

    res.status(201).json({ message: 'Signup successful. Please login.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {

    const { email, password, turnstileToken } = req.body;
    if (!turnstileToken) {
      return res.status(400).json({
        error: 'Security verification is required'
      });

    }
    const turnstileResult = await verifyTurnstile(
      turnstileToken,
      req.ip
    );

    if (!turnstileResult.success) {
      return res.status(403).json({
        error: 'Security verification failed'
      });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });

    }

    const sanitizedEmail = validator.normalizeEmail(email);

    const user = await User.findOne({ email: sanitizedEmail });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await AuditLog.create({
        action: 'failed_login',
        user_email: sanitizedEmail,
        ip_address: req.ip
      });

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        jti: crypto.randomUUID()
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    await AuditLog.create({
      action: 'login',
      user_email: sanitizedEmail,
      ip_address: req.ip
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  res.json({
    message: 'Logout successful'
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get current user'
    });
  }
});
module.exports = router;