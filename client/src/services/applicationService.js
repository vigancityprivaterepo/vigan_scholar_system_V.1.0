import api from './api'

export const applicationService = {
  submit: (formData) => api.post('/applications', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMine: () => api.get('/applications/mine'),
  resubmit: (formData) => api.patch('/applications/mine/resubmit', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  submitCOR: (formData) => api.post('/applications/mine/cor', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getCommunications: () => api.get('/applications/mine/communications'),
  getAppeals: () => api.get('/applications/mine/appeals'),
  submitAppeal: (data) => api.post('/applications/mine/appeals', data),
  getNotifications: () => api.get('/applications/notifications'),
  markRead: (id) => api.patch(`/applications/notifications/${id}/read`),
  markAllRead: () => api.patch('/applications/notifications/read-all'),
}
