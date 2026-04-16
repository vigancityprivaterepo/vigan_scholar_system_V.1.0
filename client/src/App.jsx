import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'

// Pages
import LandingPage from './pages/Landing/LandingPage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage'
import VerifyEmailPage from './pages/Auth/VerifyEmailPage'

// Applicant pages
import ApplicantLayout from './components/layout/ApplicantLayout'
import ApplicantDashboard from './pages/Applicant/Dashboard'
import ApplicationForm from './pages/Applicant/ApplicationForm'
import StatusTracker from './pages/Applicant/StatusTracker'
import NotificationsPage from './pages/Applicant/Notifications'
import CORSubmission from './pages/Applicant/CORSubmission'
import HelpPage from './pages/Applicant/HelpPage'
import RenewalForm from './pages/Applicant/RenewalForm'

// Admin pages
import AdminLayout from './components/layout/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import ApplicantList from './pages/Admin/ApplicantList'
import ApplicationReview from './pages/Admin/ApplicationReview'
import EligibilityScreening from './pages/Admin/EligibilityScreening'
import ExamInterview from './pages/Admin/ExamInterview'
import CORReview from './pages/Admin/CORReview'
import ScholarPostsManagement from './pages/Admin/ScholarPostsManagement'
import BulkEmail from './pages/Admin/BulkEmail'
import AppealsPage from './pages/Admin/Appeals'
import AdminSettings from './pages/Admin/Settings'
import CarouselManagement from './pages/Admin/CarouselManagement'
import BackupRestore from './pages/Admin/BackupRestore'
import RenewalList from './pages/Admin/RenewalList'
import RenewalReview from './pages/Admin/RenewalReview'

import NotFoundPage from './pages/NotFoundPage'
import ChangePasswordPage from './pages/ChangePasswordPage'

// Guards
import ProtectedRoute from './components/shared/ProtectedRoute'

export default function App() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontFamily: 'DM Sans, sans-serif', borderRadius: '12px' },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/overview" element={<LandingPage />} />
        <Route path="/how-it-works" element={<LandingPage />} />
        <Route path="/benefits" element={<LandingPage />} />
        <Route path="/faq" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Applicant */}
        <Route element={<ProtectedRoute role="APPLICANT" />}>
          <Route element={<ApplicantLayout />}>
            <Route path="/applicant/dashboard" element={<ApplicantDashboard />} />
            <Route path="/applicant/apply" element={<ApplicationForm />} />
            <Route path="/applicant/status" element={<StatusTracker />} />
            <Route path="/applicant/notifications" element={<NotificationsPage />} />
            <Route path="/applicant/cor" element={<CORSubmission />} />
            <Route path="/applicant/help" element={<HelpPage />} />
            <Route path="/applicant/renewal" element={<RenewalForm />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute role={['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/applicants" element={<ApplicantList />} />
            <Route path="/admin/applicants/:id" element={<ApplicationReview />} />
            <Route path="/admin/eligibility" element={<EligibilityScreening />} />
            <Route path="/admin/exam" element={<ExamInterview />} />
            <Route path="/admin/cor" element={<CORReview />} />
            <Route path="/admin/bulk-email" element={<BulkEmail />} />
            <Route path="/admin/appeals" element={<AppealsPage />} />
            <Route path="/admin/scholar-posts" element={<ScholarPostsManagement />} />
            <Route path="/admin/carousel" element={<CarouselManagement />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/backup" element={<BackupRestore />} />
            <Route path="/admin/renewals" element={<RenewalList />} />
            <Route path="/admin/renewals/:id" element={<RenewalReview />} />
          </Route>
        </Route>

        {/* Change password (protected, any role) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
