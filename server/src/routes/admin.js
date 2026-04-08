const express = require('express');
const router = express.Router();
const {
  listApplications,
  getApplication,
  updateStatus,
  batchUpdateStatus,
  scheduleExam,
  reviewCOR,
  getDashboardStats,
  sendManualNotification,
  getActivityLogs,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  listUsers,
  updateUserRole,
  inviteAdminUser,
} = require('../controllers/adminController');
const { getAdminSiteSettings, updateAdminSiteSettings } = require('../controllers/siteSettingsController');
const {
  getAdminScholarPosts,
  publishAcceptedScholars,
  deleteScholarPost,
  deleteManyScholarPosts,
  deleteAllScholarPosts,
} = require('../controllers/scholarPostController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleGuard');

router.use(authenticate, requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/applications', listApplications);
router.patch('/applications/batch-status', batchUpdateStatus);
router.get('/applications/:id', getApplication);
router.patch('/applications/:id/status', updateStatus);
router.post('/applications/:id/schedule', scheduleExam);
router.patch('/applications/:id/cor', reviewCOR);
router.post('/notify/:id', sendManualNotification);
router.get('/logs/:id', getActivityLogs);
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/read-all', markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', markAdminNotificationRead);
router.post('/users/invite', inviteAdminUser);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/settings', getAdminSiteSettings);
router.patch('/settings', updateAdminSiteSettings);
router.get('/scholars/posts', getAdminScholarPosts);
router.post('/scholars/publish', publishAcceptedScholars);
router.post('/scholars/posts/delete-many', deleteManyScholarPosts);
router.delete('/scholars/posts', deleteAllScholarPosts);
router.delete('/scholars/posts/:applicationId', deleteScholarPost);

module.exports = router;
