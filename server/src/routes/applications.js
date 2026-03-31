const express = require('express');
const router = express.Router();
const {
  submitApplication,
  getMyApplication,
  resubmit,
  submitCOR,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/applicationController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireApplicant } = require('../middleware/roleGuard');
const { upload, uploadCOR } = require('../middleware/upload');

router.use(authenticate, requireApplicant);

router.post('/', upload.array('files', 10), submitApplication);
router.get('/mine', getMyApplication);
router.patch('/mine/resubmit', upload.array('files', 10), resubmit);
router.post('/mine/cor', uploadCOR.single('cor'), submitCOR);
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);
router.patch('/notifications/:id/read', markNotificationRead);

module.exports = router;
