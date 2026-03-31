const express = require('express');
const router = express.Router();
const { getPublicScholarPosts } = require('../controllers/scholarPostController');

router.get('/', getPublicScholarPosts);

module.exports = router;
