// Security: Admin Routes with MongoDB

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const crypto = require('crypto');

const { User, AuditLog } = require('../database');

const decryptField = (encryptedData) => {
  try {
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
  } catch (e) {
    return '[Encrypted Data]';
  }
};

// Get all users - Admin only
router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });

    const decryptedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      studentId: decryptField(user.student_id_encrypted),
      phone: decryptField(user.phone_encrypted),
      role: user.role,
      createdAt: user.created_at
    }));

    await AuditLog.create({
      action: 'view_all_users',
      user_email: req.user.email,
      ip_address: req.ip
    });

    res.json(decryptedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Change user role - Admin only
router.put('/users/:id/role', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    console.log(`[ADMIN] Attempting to change role for user ${userId} to ${role}`);

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }

    // Check if trying to demote self
    if (req.user.id.toString() === userId.toString() && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot demote yourself from admin' });
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: role },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.log(`[ADMIN] User not found: ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[ADMIN] Role updated for ${updatedUser.email}: ${updatedUser.role}`);

    // Log the audit
    await AuditLog.create({
      action: `change_role_to_${role}_for_${updatedUser.email}`,
      user_email: req.user.email,
      ip_address: req.ip
    });

    res.json({ 
      message: 'User role updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user - Admin only
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const userId = String(req.params.id).trim();

    if (String(req.user.id) === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await AuditLog.create({
      action: `delete_user_${deletedUser.email}`,
      user_email: req.user.email,
      ip_address: req.ip
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get audit logs - Admin only
router.get('/audit-logs', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ created_at: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;