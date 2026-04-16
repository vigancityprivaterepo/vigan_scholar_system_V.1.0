const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireReviewer } = require('../middleware/roleGuard');
const { upload } = require('../middleware/upload');
const {
  submitRenewal,
  getMyRenewal,
  adminListRenewals,
  adminGetRenewal,
  adminUpdateRenewalStatus,
} = require('../controllers/renewalController');

// ── Applicant routes ─────────────────────────────────────────────────────────
router.post('/submit', authenticate, upload.fields([
  { name: 'cor', maxCount: 1 },
  { name: 'grades', maxCount: 1 },
]), submitRenewal);

router.get('/mine', authenticate, getMyRenewal);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get('/list', authenticate, requireReviewer, adminListRenewals);
router.get('/:id', authenticate, requireReviewer, adminGetRenewal);
router.patch('/:id/status', authenticate, requireReviewer, adminUpdateRenewalStatus);

module.exports = router;
