const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const logMeta = {
    method: req.method,
    path: req.path,
    status: statusCode,
    ip: req.ip,
    userId: req.user?.id,
  };

  if (statusCode >= 500) {
    logger.error(err.message, { ...logMeta, stack: err.stack });
  } else if (statusCode >= 400) {
    logger.warn(err.message, logMeta);
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message, errors: err.errors });
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Resource already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  const exposeMessage = process.env.NODE_ENV !== 'production' || statusCode < 500;
  res.status(statusCode).json({
    success: false,
    message: exposeMessage ? (err.message || 'Internal server error') : 'Internal server error',
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

module.exports = { errorHandler, AppError };
