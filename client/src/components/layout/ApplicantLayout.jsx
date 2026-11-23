import React, { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
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
  InfoIcon,
  LogoutIcon,
  MenuIcon,
  UsersIcon,
} from '../ui/PortalIcons'
import logo from '../../assets/logo.png'
import { prefersReducedMotion } from '../../utils/motionPreference'

// Phone tab bar. "More" also stays lit for the pages it lists.
const TABS = [
  { to: '/applicant/dashboard', label: 'Home', Icon: HomeIcon },
  { to: '/applicant/status', label: 'Status', Icon: ChartIcon },
  { to: '/applicant/notifications', label: 'Updates', Icon: BellIcon },
  { to: '/applicant/more', label: 'More', Icon: MenuIcon, also: ['/applicant/profile', '/applicant/cor', '/applicant/renewal', '/applicant/apply', '/applicant/help', '/applicant/eligibility'] },
]

const navItems = [
  { to: '/applicant/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/applicant/apply', label: 'Apply', Icon: FileTextIcon },
  { to: '/applicant/status', label: 'Status', Icon: ChartIcon },
  { to: '/applicant/notifications', label: 'Notifications', Icon: BellIcon },
  { to: '/applicant/cor', label: 'COR', Icon: DocumentIcon },
  { to: '/applicant/help', label: 'Help', Icon: InfoIcon },
  { to: '/applicant/profile', label: 'Profile', Icon: UsersIcon },
]

export default function ApplicantLayout() {
  const { user, logout } = useAuthStore()
  const { unreadCount, setNotifications } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()
  const navRef = useRef(null)
  const mainRef = useRef(null)
  const [pill, setPill] = useState(null)
  const tabIndex = TABS.findIndex((tab) => location.pathname.startsWith(tab.to) || tab.also?.some((path) => location.pathname.startsWith(path)))

  // Sliding pill under the active tab; re-measured on navigation and resize (the nav wraps).
  useEffect(() => {
    const measure = () => {
      const active = navRef.current?.querySelector('a.active')
      setPill(active ? { x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [location.pathname, unreadCount])

  // Page content eases in on navigation without remounting the page.
  useEffect(() => {
    if (prefersReducedMotion() || !mainRef.current?.animate) return
    mainRef.current.animate(
      [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' },
    )
  }, [location.pathname])

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
    <div className="min-h-screen bg-brand-page">
      <header className="sticky top-0 z-40 border-b border-brand-line bg-white">
        <div className="app-header">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
            <NavLink to="/applicant/dashboard" className="flex min-w-0 items-center gap-3">
              <img src={logo} alt="Vigan City Seal" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-1" />
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-semibold text-white">City Government of Vigan</p>
                <p className="truncate text-xs text-emerald-100">Scholarship Program</p>
              </div>
            </NavLink>

            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="text-sm font-medium text-white">{user?.fullName}</p>
                <p className="text-xs text-emerald-100">Applicant</p>
              </div>
              <button
                onClick={handleLogout}
                className="hidden items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 md:inline-flex"
              >
                <LogoutIcon className="h-4 w-4" />
                Logout
              </button>
              <button
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white md:hidden"
                onClick={() => navigate('/applicant/notifications')}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
              >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span key={unreadCount} className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] animate-pop-in items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden border-t border-brand-line bg-white md:block">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-8 lg:flex-row lg:items-center lg:justify-between">
            <nav ref={navRef} className="relative hidden flex-wrap items-center gap-2 md:flex">
              {pill && (
                <span
                  className="pointer-events-none absolute left-0 top-0 rounded-control bg-emerald-100 transition-[transform,width] duration-slow ease-spring"
                  style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }}
                  aria-hidden="true"
                />
              )}
              {navItems.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `press inline-flex min-h-10 items-center gap-2 rounded-control px-3 py-2 text-[15px] font-semibold transition-colors duration-fast ${
                      isActive ? 'relative text-brand-dark' : 'relative text-slate-600 hover:bg-brand-bg hover:text-brand-dark'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

      </header>

      <main ref={mainRef} className="mx-auto w-full max-w-7xl p-4 pb-28 md:p-8">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Main">
        {tabIndex >= 0 && (
          <span
            className="pointer-events-none absolute left-2 top-1.5 flex h-[52px] justify-center transition-transform duration-slow ease-spring"
            style={{ width: 'calc((100% - 16px) / 4)', transform: `translateX(${tabIndex * 100}%)` }}
            aria-hidden="true"
          >
            <span className="mt-0.5 h-8 w-16 rounded-2xl bg-emerald-100" />
          </span>
        )}
        {TABS.map(({ to, label, Icon }, i) => (
          <NavLink key={to} to={to} className={`tabbar-item relative ${i === tabIndex ? 'active' : ''}`} aria-current={i === tabIndex ? 'page' : undefined}>
            <span className="relative mt-1.5 flex h-7 items-center">
              <Icon className="h-6 w-6" />
              {label === 'Updates' && unreadCount > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-[1.25rem] animate-pop-in items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
