import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import {
  ChartIcon,
  UsersIcon,
  ShieldCheckIcon,
  ClipboardIcon,
  DocumentIcon,
  FileTextIcon,
  MailIcon,
  CogIcon,
  LogoutIcon,
  MenuIcon,
  PhotoIcon,
  DatabaseIcon,
} from '../ui/PortalIcons'
import { adminService } from '../../services/adminService'
import logo from '../../assets/logo.png'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', Icon: ChartIcon },
  { to: '/admin/applicants', label: 'Applicants', Icon: UsersIcon },
  { to: '/admin/eligibility', label: 'Eligibility', Icon: ShieldCheckIcon },
  { to: '/admin/exam', label: 'Exam / Interview', Icon: ClipboardIcon },
  { to: '/admin/cor', label: 'COR Review', Icon: DocumentIcon },
  { to: '/admin/appeals', label: 'Appeals', Icon: FileTextIcon },
  { to: '/admin/bulk-email', label: 'Bulk Email', Icon: MailIcon },
  { to: '/admin/scholar-posts', label: 'Scholar Posts', Icon: FileTextIcon },
  { to: '/admin/carousel', label: 'Carousel', Icon: PhotoIcon },
  { to: '/admin/settings', label: 'Settings', Icon: CogIcon },
  { to: '/admin/backup', label: 'Backup', Icon: DatabaseIcon, superAdminOnly: true },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const fetchNotifications = () => {
    adminService.getNotifications()
      .then((r) => setNotifications(r.data.notifications || []))
      .catch(() => {})
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleMarkAllRead = async () => {
    await adminService.markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleNotifClick = async (notif) => {
    if (!notif.isRead) {
      await adminService.markNotificationRead(notif.id)
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n))
    }
    setNotifOpen(false)
    if (notif.applicationId) navigate(`/admin/applicants/${notif.applicationId}`)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-300 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#0c2340] via-[#0f3460] to-[#0c4a3a] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
            <NavLink to="/admin/dashboard" className="flex min-w-0 items-center gap-3">
              <img src={logo} alt="Vigan City Seal" className="h-10 w-10 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-slate-200">Scholarship Office</p>
                <p className="truncate font-display text-xl font-bold text-white">Admin Portal</p>
              </div>
            </NavLink>

            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative inline-flex rounded-md border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                  aria-label="Notifications"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="fixed inset-x-3 top-[100px] z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-brand-primary">Notifications</p>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-slate-500 hover:text-brand-primary">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotifClick(notif)}
                            className={`w-full border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${!notif.isRead ? 'bg-blue-50/60' : ''}`}
                          >
                            <div className="flex items-start gap-2">
                              {!notif.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                              <div className={!notif.isRead ? '' : 'pl-4'}>
                                <p className="text-xs font-semibold text-slate-700">{notif.title}</p>
                                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{notif.message}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden text-right md:block">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-200">Administrator</p>
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
                aria-label="Toggle admin menu"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-300 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <nav className="hidden flex-wrap items-center gap-2 md:flex">
              {navItems.filter(item => !item.superAdminOnly || user?.role === 'SUPER_ADMIN').map(({ to, label, Icon }) => (
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
                </NavLink>
              ))}
            </nav>
            <p className="hidden text-sm text-slate-500 lg:block">Review applications, schedules, and scholar records.</p>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-300 bg-white md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col px-4 py-2">
              {navItems.filter(item => !item.superAdminOnly || user?.role === 'SUPER_ADMIN').map(({ to, label, Icon }) => (
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
