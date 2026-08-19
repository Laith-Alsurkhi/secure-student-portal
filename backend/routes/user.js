// Security: User Routes with MongoDB
// Handles user profile operations with authentication

const express = require('express');
const router = express.Router();
const validator = require('validator');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');

const { User, AuditLog } = require('../database');

// Security: Decryption function for sensitive fields
const decryptField = (encryptedData) => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
  }

  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);

  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Security: Encryption function for sensitive fields
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

// Get user profile - Protected route
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const decryptedStudentId = decryptField(user.student_id_encrypted);
    const decryptedPhone = decryptField(user.phone_encrypted);

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      studentId: decryptedStudentId,
      phone: decryptedPhone,
      role: user.role,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile - Protected route
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const sanitizedName = validator.escape(name);
    const sanitizedPhone = validator.escape(phone);

    if (!validator.isMobilePhone(sanitizedPhone, 'any')) {
      return res.status(400).json({ error: 'Invalid phone format' });
    }

    const encryptedPhone = encryptField(sanitizedPhone);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: sanitizedName,
        phone_encrypted: encryptedPhone
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await AuditLog.create({
      action: 'profile_update',
      user_email: req.user.email,
      ip_address: req.ip
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;