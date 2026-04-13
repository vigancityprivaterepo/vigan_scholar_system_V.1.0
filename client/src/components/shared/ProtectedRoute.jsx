import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function ProtectedRoute({ role }) {
  const { user, isLoading } = useAuthStore()
  const normalizedAllowedRoles = Array.isArray(role) ? role : role ? [role] : []

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(user.role)) {
    const isAdminRole = ['ADMIN', 'SUPER_ADMIN', 'REVIEWER', 'SCHEDULER'].includes(user.role)
    return <Navigate to={isAdminRole ? '/admin/dashboard' : '/applicant/dashboard'} replace />
  }

  return <Outlet />
}
