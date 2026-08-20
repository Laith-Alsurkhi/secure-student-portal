// Security: JWT Authentication Middleware
// Verifies JWT tokens and protects private routes

const jwt = require('jsonwebtoken');
const { User } = require('../database');

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No session provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get the latest user data from MongoDB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

module.exports = authMiddleware;