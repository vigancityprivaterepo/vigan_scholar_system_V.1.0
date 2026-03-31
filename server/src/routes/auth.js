const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, forgotPassword, resetPassword, refresh, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
