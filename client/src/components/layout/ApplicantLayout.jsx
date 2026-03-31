import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import { applicationService } from '../../services/applicationService'
import {
  ChartIcon,
  FileTextIcon,
  BellIcon,
  DocumentIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
} from '../ui/PortalIcons'
import logo from '../../assets/logo.png'

const navItems = [
  { to: '/applicant/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/applicant/apply', label: 'Apply', Icon: FileTextIcon },
  { to: '/applicant/status', label: 'Status', Icon: ChartIcon },
  { to: '/applicant/notifications', label: 'Notifications', Icon: BellIcon },
  { to: '/applicant/cor', label: 'COR', Icon: DocumentIcon },
]

export default function ApplicantLayout() {
  const { user, logout } = useAuthStore()
  const { unreadCount, setNotifications } = useAppStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    applicationService.getNotifications()
      .then(r => setNotifications(r.data.notifications))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-300 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#0f3d6d] via-[#164f8c] to-[#0f3d6d] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
            <NavLink to="/applicant/dashboard" className="flex min-w-0 items-center gap-3">
              <img src={logo} alt="Vigan City Seal" className="h-10 w-10 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-200">Scholarship Applicant Portal</p>
                <p className="truncate font-display text-xl font-bold text-white">City Government of Vigan</p>
              </div>
            </NavLink>

            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-200">Applicant Account</p>
                <p className="text-sm font-medium text-white">{user?.fullName}</p>
              </div>
              <button
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 md:inline-flex"
              >
                <LogoutIcon className="h-4 w-4" />
                Logout
              </button>
              <button
                className="inline-flex rounded-md border border-white/20 bg-white/10 p-2 text-white md:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-300 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <nav className="hidden flex-wrap items-center gap-2 md:flex">
              {navItems.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-brand-primary text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-brand-primary'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <p className="hidden text-sm text-slate-500 lg:block">Track your application progress and scholarship requirements online.</p>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-300 bg-white md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col px-4 py-2">
              {navItems.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-3 text-sm ${
                      isActive ? 'font-semibold text-brand-primary' : 'text-slate-700'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="mt-2 flex items-center gap-3 border-t border-slate-200 px-2 py-3 text-sm font-medium text-slate-700"
              >
                <LogoutIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
