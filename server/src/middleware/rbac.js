// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Company owner has universal access. Super Admin is the legacy name for Owner.
    if (req.user.role === 'Owner' || req.user.role === 'Super Admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role [${req.user.role}] does not have permission to perform this action. Required: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = { authorize };
