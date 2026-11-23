import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import {
  BellIcon,
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
  GraduationCapIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  XIcon,
} from '../ui/PortalIcons'
import { adminService } from '../../services/adminService'
import api from '../../services/api'
import logo from '../../assets/logo.png'
import { prefersReducedMotion } from '../../utils/motionPreference'

const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', Icon: ChartIcon, keywords: ['overview', 'stats'] },
      { to: '/admin/applicants', label: 'Applicants', Icon: UsersIcon, badgeKey: 'applicants', keywords: ['applications', 'queue'] },
      { to: '/admin/masterlist', label: 'Masterlist', Icon: GraduationCapIcon, keywords: ['scholars', 'accepted'] },
      { to: '/admin/top-scores', label: 'Top Scores', Icon: ChartIcon, keywords: ['exam scores', 'ranking'] },
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    items: [
      { to: '/admin/eligibility', label: 'Eligibility', Icon: ShieldCheckIcon, badgeKey: 'eligibility', keywords: ['screening'] },
      { to: '/admin/exam', label: 'Exam / Interview', Icon: ClipboardIcon, badgeKey: 'exam', keywords: ['schedule', 'interview'] },
      { to: '/admin/cor', label: 'COR Review', Icon: DocumentIcon, badgeKey: 'cor', keywords: ['certificate'] },
      { to: '/admin/renewals', label: 'Renewals', Icon: DocumentIcon, badgeKey: 'renewals', keywords: ['renewal'] },
      { to: '/admin/appeals', label: 'Appeals', Icon: FileTextIcon, badgeKey: 'appeals', keywords: ['reconsideration'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/admin/bulk-email', label: 'Bulk Email', Icon: MailIcon, keywords: ['notifications', 'mail'] },
      { to: '/admin/scholar-posts', label: 'Scholar Posts', Icon: FileTextIcon, keywords: ['publishing'] },
      { to: '/admin/carousel', label: 'Carousel', Icon: PhotoIcon, keywords: ['banner', 'landing'] },
      { to: '/admin/settings', label: 'Settings', Icon: CogIcon, keywords: ['configuration'] },
      { to: '/admin/backup', label: 'Backup', Icon: DatabaseIcon, superAdminOnly: true, keywords: ['restore', 'database'] },
    ],
  },
]

const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)

const ROLE_LABELS = { SUPER_ADMIN: 'Super admin', ADMIN: 'Admin', REVIEWER: 'Reviewer', SCHEDULER: 'Scheduler' }

const matchesPath = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`)

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'AD'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('')
}

export default function AdminLayout() {
  const { user, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [notificationTotal, setNotificationTotal] = useState(0)
  const [loadingOlderNotifications, setLoadingOlderNotifications] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [navBadges, setNavBadges] = useState({})
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState({ overview: true, workflow: true, operations: true })
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false)
  const notifRef = useRef(null)
  const profileImageInputRef = useRef(null)
  const navScrollRef = useRef(null)
  const mainRef = useRef(null)
  const searchRef = useRef(null)
  const [pill, setPill] = useState(null)

  const availableSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.superAdminOnly || user?.role === 'SUPER_ADMIN'),
  })).filter((section) => section.items.length > 0)

  const activeSection = availableSections.find((section) => section.items.some((item) => matchesPath(location.pathname, item.to)))
  const activeItem = activeSection?.items.find((item) => matchesPath(location.pathname, item.to)) || null
  const unreadCount = unreadNotificationCount

  // The refresh brings in the newest page and keeps any older ones already loaded with "Show older".
  const fetchNotifications = () => {
    adminService.getNotifications()
      .then((response) => {
        const latest = response.data.notifications || []
        const latestIds = new Set(latest.map((item) => item.id))
        setNotifications((current) => [...latest, ...current.filter((item) => !latestIds.has(item.id))])
        setUnreadNotificationCount(response.data.unreadCount || 0)
        setNotificationTotal(response.data.total || 0)
      })
      .catch(() => {})
  }

  const loadOlderNotifications = async () => {
    setLoadingOlderNotifications(true)
    try {
      const response = await adminService.getNotifications({ offset: notifications.length, limit: 20 })
      const older = response.data.notifications || []
      setNotifications((current) => {
        const seen = new Set(current.map((item) => item.id))
        return [...current, ...older.filter((item) => !seen.has(item.id))]
      })
      setUnreadNotificationCount(response.data.unreadCount || 0)
      setNotificationTotal(response.data.total || 0)
    } catch {
      // Leave the list as it is; the button stays so they can try again.
    } finally {
      setLoadingOlderNotifications(false)
    }
  }

  const fetchNavBadges = () => {
    adminService.getStats()
      .then((response) => {
        const { stats } = response.data
        setNavBadges({
          applicants: stats.byStatus?.PENDING_REVIEW || 0,
          eligibility: stats.byStatus?.ELIGIBILITY_SCREENING || 0,
          exam: stats.byStatus?.EXAM_INTERVIEW || 0,
          cor: stats.byStatus?.COR_SUBMITTED || 0,
          renewals: stats.pendingRenewals || 0,
          appeals: stats.appeals?.PENDING || 0,
        })
      })
      .catch(() => {})
  }

  // Move the sidebar pill under the active link (also after a section opens or closes).
  useEffect(() => {
    const box = navScrollRef.current
    const active = box?.querySelector('.nav-link.active')
    setPill(active ? active.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop : null)
  }, [location.pathname, openSections])

  // "/" jumps to the header search, unless the user is already typing somewhere.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return
      if (!searchRef.current || searchRef.current.offsetParent === null) return
      event.preventDefault()
      searchRef.current.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Page content eases in on navigation without remounting the page.
  useEffect(() => {
    const reduce = prefersReducedMotion()
    if (reduce || !mainRef.current?.animate) return
    mainRef.current.animate(
      [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
      { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' },
    )
  }, [location.pathname])

  useEffect(() => {
    fetchNotifications()
    fetchNavBadges()
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications()
        fetchNavBadges()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeSection?.id) {
      setOpenSections((current) => ({ ...current, [activeSection.id]: true }))
    }
    setMenuOpen(false)
  }, [activeSection?.id, location.pathname])

  useEffect(() => {
    const handleClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setNotifOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const handleMarkAllRead = async () => {
    await adminService.markAllNotificationsRead()
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
    setUnreadNotificationCount(0)
  }

  const handleNotifClick = async (notification) => {
    if (!notification.isRead) {
      await adminService.markNotificationRead(notification.id)
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item))
      setUnreadNotificationCount((current) => Math.max(0, current - 1))
    }

    setNotifOpen(false)
    if (notification.applicationId) {
      navigate(`/admin/applicants/${notification.applicationId}`)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const query = search.trim().toLowerCase()
    if (!query) return

    const match = ALL_NAV_ITEMS.find((item) => {
      const haystack = [item.label, ...(item.keywords || [])].join(' ').toLowerCase()
      return haystack.includes(query)
    })

    if (match) {
      navigate(match.to)
      setSearch('')
      return
    }

    navigate(`/admin/applicants?search=${encodeURIComponent(search.trim())}`)
    setSearch('')
  }

  const toggleSection = (sectionId) => {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))
  }

  const openProfileImagePicker = () => {
    if (!uploadingProfileImage) {
      profileImageInputRef.current?.click()
    }
  }

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user) return

    const formData = new FormData()
    formData.append('fullName', user.fullName || '')
    formData.append('contact', user.contact || '')
    formData.append('profileImage', file)

    setUploadingProfileImage(true)
    try {
      const response = await api.patch('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUser(response.data.user)
      toast.success(response.data.message || 'Profile photo updated successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile photo.')
    } finally {
      setUploadingProfileImage(false)
    }
  }

  const renderAvatar = (className = 'avatar', imageClassName = 'h-full w-full object-cover') => {
    if (user?.profileImageUrl) {
      return (
        <span className={`${className} overflow-hidden bg-white/10`}>
          <img src={user.profileImageUrl} alt={user.fullName || 'Profile'} className={imageClassName} />
        </span>
      )
    }

    return <span className={className}>{getInitials(user?.fullName)}</span>
  }

  return (
    <div className="min-h-screen bg-brand-page text-slate-800">
      <input
        ref={profileImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleProfileImageChange}
      />

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 animate-fade-in bg-brand-primary/35 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`navbar navbar-vertical flex transition-[transform,visibility] duration-slow ease-out lg:visible lg:translate-x-0 ${menuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div>
            <Link to="/admin/dashboard" className="navbar-brand">
              <img src={logo} alt="Vigan City Seal" className="h-10 w-10 rounded-full bg-white p-1" />
              <div className="min-w-0">
                <div className="text-sm text-emerald-200">Scholarship Office</div>
                <div className="truncate font-display text-lg font-semibold text-white">Admin Console</div>
              </div>
            </Link>
          </div>

          <div ref={navScrollRef} className={`relative flex-1 overflow-y-auto px-3 py-3 ${pill !== null ? 'has-pill' : ''}`}>
            {pill !== null && <span className="nav-pill" style={{ transform: `translateY(${pill}px)` }} aria-hidden="true" />}
            {availableSections.map((section) => {
              const isOpen = openSections[section.id] ?? true
              const hasActiveItem = section.items.some((item) => matchesPath(location.pathname, item.to))

              return (
                <div key={section.id} className="mb-3 last:mb-0">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`flex w-full items-center justify-between pr-2 text-left ${hasActiveItem ? 'text-white' : 'text-emerald-300'}`}
                  >
                    <span className="nav-section-label">{section.label}</span>
                    {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </button>

                  {isOpen && (
                    <ul className="navbar-nav">
                      {section.items.map(({ to, label, Icon, badgeKey }) => {
                        const badge = badgeKey ? navBadges[badgeKey] || 0 : 0
                        return (
                          <li key={to} className="nav-item">
                            <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                              {({ isActive }) => (
                                <>
                                  <Icon className="h-4 w-4 shrink-0" />
                                  <span className="min-w-0 flex-1 truncate">{label}</span>
                                  {badge > 0 && <span className={`badge ${isActive ? 'bg-emerald-500 text-brand-dark' : 'bg-white/[0.14] text-white'}`} aria-label={`${badge} waiting`}>{badge}</span>}
                                </>
                              )}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <div className="border-t border-white/10 p-2.5">
            <div className="rounded-card bg-white/[0.06] p-2.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openProfileImagePicker}
                  disabled={uploadingProfileImage}
                  className="shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Upload profile picture"
                >
                  {renderAvatar('avatar')}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{user?.fullName || 'Administrator'}</p>
                  <p className="truncate text-xs text-emerald-200">{ROLE_LABELS[user?.role] || 'Staff'}</p>
                  <button
                    type="button"
                    onClick={openProfileImagePicker}
                    disabled={uploadingProfileImage}
                    className="mt-1 text-xs font-medium text-emerald-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {uploadingProfileImage ? 'Uploading photo...' : 'Upload photo'}
                  </button>
                </div>
              </div>
              <button type="button" onClick={handleLogout} className="btn mt-2.5 w-full justify-center border-white/20 bg-transparent px-3 py-2 text-sm text-white hover:border-white/40 hover:bg-white/10">
                <LogoutIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="page-wrapper">
        <header className="navbar sticky top-0 z-20 text-brand-primary">
          <div className="flex w-full flex-col gap-3 px-4 py-3 md:px-6 lg:px-7">
            <div className="flex min-h-10 items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border-[1.5px] border-slate-300 bg-white text-brand-primary transition hover:border-slate-400 hover:bg-brand-bg lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open sidebar">
                  <MenuIcon className="h-4 w-4" />
                </button>

                <nav className="min-w-0" aria-label="Breadcrumb">
                  <ol className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[15px] text-slate-500">
                    <li>
                      <Link to="/admin/dashboard" className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-teal">
                        <HomeIcon className="h-4 w-4" />
                        <span>Admin</span>
                      </Link>
                    </li>
                    {activeSection && <><li aria-hidden="true">/</li><li className="hidden sm:block">{activeSection.label}</li><li aria-hidden="true" className="hidden sm:block">/</li></>}
                    {activeItem && <li className="truncate font-semibold text-brand-primary" aria-current="page">{activeItem.label}</li>}
                  </ol>
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="hidden md:block">
                  <div className="relative flex w-[300px] items-center">
                    <input
                      ref={searchRef}
                      aria-keyshortcuts="/"
                      aria-label="Search pages or applicants (press /)"
                      type="search"
                      className="form-control h-10 py-0 pl-9 pr-11"
                      placeholder="Search applicants or pages"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
                    <kbd className="pointer-events-none absolute right-2.5 rounded-md border border-slate-200 px-1.5 text-xs font-medium text-slate-500" aria-hidden="true">/</kbd>
                  </div>
                </form>

                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border-[1.5px] border-slate-300 bg-white text-brand-primary transition hover:border-slate-400 hover:bg-brand-bg"
                    onClick={() => setNotifOpen((current) => !current)}
                    aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                    aria-haspopup="true"
                    aria-expanded={notifOpen}
                  >
                    <BellIcon className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span key={unreadCount} className="badge-bounce absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] animate-pop-in items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="dropdown-card absolute right-0 top-full z-30 mt-2 w-[22rem] origin-top-right animate-pop-in max-w-[calc(100vw-2rem)]">
                      <div className="card-header">
                        <div>
                          <div className="card-title">Notifications</div>
                          {notificationTotal > 0 && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              Showing {Math.min(notifications.length, notificationTotal)} of {notificationTotal}
                              {unreadCount > 0 && ` · ${unreadCount} unread`}
                            </p>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button type="button" onClick={handleMarkAllRead} className="btn btn-ghost-secondary px-2 py-1 text-xs">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-5 py-8 text-center text-sm text-slate-500">You're up to date. New submissions and status changes will show here.</p>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              type="button"
                              key={notification.id}
                              onClick={() => handleNotifClick(notification)}
                              className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-brand-bg ${notification.isRead ? '' : 'bg-emerald-50'}`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.isRead ? 'bg-slate-200' : 'bg-emerald-500'}`} />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                                  <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                        {notifications.length > 0 && notifications.length < notificationTotal && (
                          <button
                            type="button"
                            onClick={loadOlderNotifications}
                            disabled={loadingOlderNotifications}
                            className="w-full px-5 py-3 text-center text-sm font-semibold text-brand-teal transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingOlderNotifications ? 'Loading…' : 'Show older notifications'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden items-center gap-3 pl-1 md:flex">
                  <button
                    type="button"
                    onClick={openProfileImagePicker}
                    disabled={uploadingProfileImage}
                    className="shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-70"
                    aria-label="Upload profile picture"
                  >
                    {renderAvatar('avatar h-9 w-9')}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-primary">{user?.fullName || 'Administrator'}</p>
                    {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <form onSubmit={handleSearchSubmit}>
                <div className="input-icon">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search pages or applicants"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <span className="input-icon-addon">
                    <SearchIcon className="h-4 w-4" />
                  </span>
                </div>
              </form>
            </div>
          </div>
        </header>

        <main ref={mainRef} className="page-body">
          <Outlet />
        </main>
      </div>

      {menuOpen && (
        <button
          type="button"
          className="fixed right-4 top-4 z-50 rounded-full border border-white/20 bg-brand-dark p-2 text-white shadow-raised lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close sidebar"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
