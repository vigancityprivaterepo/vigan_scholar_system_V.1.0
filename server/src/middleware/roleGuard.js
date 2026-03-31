const { AppError } = require('./errorHandler');

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Forbidden: insufficient permissions', 403));
  }
  next();
};

const requireAdmin = requireRole('ADMIN');
const requireApplicant = requireRole('APPLICANT');

module.exports = { requireRole, requireAdmin, requireApplicant };
