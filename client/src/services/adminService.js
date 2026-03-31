import api from './api'

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  listApplications: (params) => api.get('/admin/applications', { params }),
  getApplication: (id) => api.get(`/admin/applications/${id}`),
  updateStatus: (id, data) => api.patch(`/admin/applications/${id}/status`, data),
  scheduleExam: (id, data) => api.post(`/admin/applications/${id}/schedule`, data),
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

  // Carousel CMS
  getCarouselSlides: () => api.get('/carousel/admin'),
  createCarouselSlide: (formData) => api.post('/carousel/admin', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateCarouselSlide: (id, formData) => api.patch(`/carousel/admin/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteCarouselSlide: (id) => api.delete(`/carousel/admin/${id}`),
}
