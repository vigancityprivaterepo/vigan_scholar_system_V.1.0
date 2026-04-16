import api from './api'

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  listApplications: (params) => api.get('/admin/applications', { params }),
  getApplication: (id) => api.get(`/admin/applications/${id}`),
  updateStatus: (id, data) => api.patch(`/admin/applications/${id}/status`, data),
  batchUpdateStatus: (data) => api.patch('/admin/applications/batch-status', data),
  previewBulkEmailRecipients: (data) => api.post('/admin/applications/bulk-email/preview', data),
  sendBulkEmailTest: (data) => api.post('/admin/applications/bulk-email/test', data),
  bulkEmailApplicants: (data) => api.post('/admin/applications/bulk-email', data),
  scheduleBulkEmailApplicants: (data) => api.post('/admin/applications/bulk-email/schedule', data),
  listBulkEmailJobs: (params) => api.get('/admin/applications/bulk-email/jobs', { params }),
  getBulkEmailLogs: (params) => api.get('/admin/applications/bulk-email/logs', { params }),
  scheduleExam: (id, data) => api.post(`/admin/applications/${id}/schedule`, data),
  bulkScheduleExam: (data) => api.post('/admin/applications/bulk-schedule', data),
  reviewCOR: (id, data) => api.patch(`/admin/applications/${id}/cor`, data),
  sendNotification: (id, data) => api.post(`/admin/notify/${id}`, data),
  getLogs: (id) => api.get(`/admin/logs/${id}`),
  getSiteSettings: () => api.get('/admin/settings'),
  updateSiteSettings: (data) => api.patch('/admin/settings', data),
  getPostedScholars: () => api.get('/admin/scholars/posts'),
  publishAcceptedScholars: () => api.post('/admin/scholars/publish'),
  deleteManyPostedScholars: (applicationIds) => api.post('/admin/scholars/posts/delete-many', { applicationIds }),
  deleteAllPostedScholars: () => api.delete('/admin/scholars/posts'),
  deletePostedScholar: (applicationId) => api.delete(`/admin/scholars/posts/${applicationId}`),

  // Admin notifications
  getNotifications: () => api.get('/admin/notifications'),
  markNotificationRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/admin/notifications/read-all'),
  listUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  inviteAdminUser: (data) => api.post('/admin/users/invite', data),
  listAppeals: (params) => api.get('/admin/appeals', { params }),
  resolveAppeal: (id, data) => api.patch(`/admin/appeals/${id}`, data),

  // Backup & Restore
  createBackup: () => api.post('/admin/backup'),
  listBackups: () => api.get('/admin/backup'),
  downloadBackup: (filename) => api.get(`/admin/backup/${encodeURIComponent(filename)}`, { responseType: 'blob' }),
  deleteBackup: (filename) => api.delete(`/admin/backup/${encodeURIComponent(filename)}`),
  restoreBackup: (formData) => api.post('/admin/backup/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  restoreBackupFromServer: (filename) => api.post(`/admin/backup/${encodeURIComponent(filename)}/restore`, {}, { timeout: 120000 }),

  // Carousel CMS
  getCarouselSlides: () => api.get('/carousel/admin'),
  createCarouselSlide: (formData) => api.post('/carousel/admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateCarouselSlide: (id, formData) => api.patch(`/carousel/admin/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteCarouselSlide: (id) => api.delete(`/carousel/admin/${id}`),

  // Scholarship renewals
  listRenewals: (params) => api.get('/renewals/list', { params }),
  getRenewal: (id) => api.get(`/renewals/${id}`),
  updateRenewalStatus: (id, data) => api.patch(`/renewals/${id}/status`, data),
}
