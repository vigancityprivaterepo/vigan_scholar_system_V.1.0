const { AppError } = require('./errorHandler');

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Forbidden: insufficient permissions', 403));
  }
  next();
};

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'];
const requireAdmin = requireRole(...ADMIN_ROLES);
const requireReviewer = requireRole('ADMIN', 'SUPER_ADMIN', 'REVIEWER');
const requireScheduler = requireRole('ADMIN', 'SUPER_ADMIN', 'SCHEDULER');
const requireSuperAdmin = requireRole('SUPER_ADMIN');
const requireApplicant = requireRole('APPLICANT');

module.exports = {
  requireRole,
  requireAdmin,
  requireReviewer,
  requireScheduler,
  requireSuperAdmin,
  requireApplicant,
  ADMIN_ROLES,
};
