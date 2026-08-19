// Security: Role-Based Authorization Middleware
// Protects admin-only routes

const roleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    // Security: Check user role from JWT token
    if (!req.user || req.user.role !== requiredRole) {
      // Security: Don't expose sensitive information about actual roles
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};

module.exports = roleMiddleware;
