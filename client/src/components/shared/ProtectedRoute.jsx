import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function ProtectedRoute({ role }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-10 h-10 border-4 border-brand-teal border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/applicant/dashboard'} replace />
  }

  return <Outlet />
}
