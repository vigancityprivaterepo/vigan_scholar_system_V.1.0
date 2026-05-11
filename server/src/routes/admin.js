const express = require('express');
const router = express.Router();
const {
  listApplications,
  getApplication,
  updateStatus,
  updateApplicationFields,
  batchUpdateStatus,
  previewBulkEmailRecipients,
  sendBulkEmailTest,
  bulkEmailApplicants,
  scheduleBulkEmailApplicants,
  listEmailJobs,
  scheduleExam,
  bulkScheduleExam,
  reviewCOR,
  getDashboardStats,
  sendManualNotification,
  getActivityLogs,
  listBulkEmailLogs,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  listUsers,
  updateUserRole,
  deleteUser,
  deleteApplicant,
  inviteAdminUser,
  listAppeals,
  resolveAppeal,
} = require('../controllers/adminController');
const { getAdminSiteSettings, updateAdminSiteSettings } = require('../controllers/siteSettingsController');
const { createBackup, listBackups, downloadBackup, deleteBackup, restoreBackup, restoreBackupFromServer, upload } = require('../controllers/backupController');
const {
  getAdminScholarPosts,
  publishAcceptedScholars,
  deleteScholarPost,
  deleteManyScholarPosts,
  deleteAllScholarPosts,
} = require('../controllers/scholarPostController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin, requireReviewer, requireScheduler, requireSuperAdmin } = require('../middleware/roleGuard');

router.use(authenticate, requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/applications', listApplications);
router.get('/appeals', requireReviewer, listAppeals);
router.patch('/appeals/:id', requireReviewer, resolveAppeal);
router.patch('/applications/batch-status', requireReviewer, batchUpdateStatus);
router.post('/applications/bulk-email/preview', previewBulkEmailRecipients);
router.post('/applications/bulk-email/test', sendBulkEmailTest);
router.post('/applications/bulk-email', requireReviewer, bulkEmailApplicants);
router.post('/applications/bulk-email/schedule', requireScheduler, scheduleBulkEmailApplicants);
router.get('/applications/bulk-email/jobs', requireScheduler, listEmailJobs);
router.get('/applications/bulk-email/logs', listBulkEmailLogs);
router.get('/applications/:id', getApplication);
router.delete('/applications/:id/applicant', requireSuperAdmin, deleteApplicant);
router.patch('/applications/:id/status', requireReviewer, updateStatus);
router.patch('/applications/:id/fields', requireReviewer, updateApplicationFields);
router.post('/applications/bulk-schedule', requireScheduler, bulkScheduleExam);
router.post('/applications/:id/schedule', requireScheduler, scheduleExam);
router.patch('/applications/:id/cor', requireReviewer, reviewCOR);
router.post('/notify/:id', sendManualNotification);
router.get('/logs/:id', getActivityLogs);
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/read-all', markAllAdminNotificationsRead);
router.patch('/notifications/:id/read', markAdminNotificationRead);
router.post('/users/invite', requireSuperAdmin, inviteAdminUser);
router.get('/users', requireSuperAdmin, listUsers);
router.patch('/users/:id/role', requireSuperAdmin, updateUserRole);
router.delete('/users/:id', requireSuperAdmin, deleteUser);
router.get('/settings', getAdminSiteSettings);
router.patch('/settings', updateAdminSiteSettings);
router.get('/scholars/posts', getAdminScholarPosts);
router.post('/scholars/publish', requireReviewer, publishAcceptedScholars);
router.post('/scholars/posts/delete-many', deleteManyScholarPosts);
router.delete('/scholars/posts', deleteAllScholarPosts);
router.delete('/scholars/posts/:applicationId', deleteScholarPost);

// Backup & Restore (SUPER_ADMIN only)
router.post('/backup', requireSuperAdmin, createBackup);
router.get('/backup', requireSuperAdmin, listBackups);
router.get('/backup/:filename', requireSuperAdmin, downloadBackup);
router.delete('/backup/:filename', requireSuperAdmin, deleteBackup);
router.post('/backup/restore', requireSuperAdmin, upload.single('backup'), restoreBackup);
router.post('/backup/:filename/restore', requireSuperAdmin, restoreBackupFromServer);

module.exports = router;
