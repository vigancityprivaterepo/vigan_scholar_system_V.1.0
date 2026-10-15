const express = require('express');
const router = express.Router();
const { register, login, googleAuth, verifyEmail, forgotPassword, resetPassword, refresh, logout, me, changePassword, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadImage } = require('../middleware/upload');
const { loginLimiter, emailSendLimiter, resetLimiter, authIpLimiter } = require('../middleware/rateLimits');

router.post('/register', authIpLimiter, emailSendLimiter, register);
router.post('/login', authIpLimiter, loginLimiter, login);
router.post('/google', authIpLimiter, googleAuth);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', authIpLimiter, emailSendLimiter, forgotPassword);
router.post('/reset-password', authIpLimiter, resetLimiter, resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.patch('/profile', authenticate, uploadImage.single('profileImage'), updateProfile);

module.exports = router;

