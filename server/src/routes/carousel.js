const express = require('express');
const router = express.Router();
const { getPublicSlides, getAllSlides, createSlide, updateSlide, deleteSlide } = require('../controllers/carouselController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleGuard');
const { uploadImage } = require('../middleware/upload');

// Public — landing page fetches active slides
router.get('/', getPublicSlides);

// Admin — full CRUD
router.get('/admin', authenticate, requireAdmin, getAllSlides);
router.post('/admin', authenticate, requireAdmin, uploadImage.single('image'), createSlide);
router.patch('/admin/:id', authenticate, requireAdmin, uploadImage.single('image'), updateSlide);
router.delete('/admin/:id', authenticate, requireAdmin, deleteSlide);

module.exports = router;
