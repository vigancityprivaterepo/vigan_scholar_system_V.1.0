const express = require('express');
const router = express.Router();
const { register, login, googleAuth, verifyEmail, forgotPassword, resetPassword, refresh, logout, me, changePassword, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.patch('/profile', authenticate, updateProfile);

module.exports = router;
