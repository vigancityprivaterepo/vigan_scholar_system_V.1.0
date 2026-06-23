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
  const [notifOpen, setNotifOpen] = useState(false)
  const [navBadges, setNavBadges] = useState({})
  const [search, setSearch] = useState('')
  const [openSections, setOpenSections] = useState({ overview: true, workflow: true, operations: true })
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false)
  const notifRef = useRef(null)
  const profileImageInputRef = useRef(null)

  const availableSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.superAdminOnly || user?.role === 'SUPER_ADMIN'),
  })).filter((section) => section.items.length > 0)

  const activeSection = availableSections.find((section) => section.items.some((item) => matchesPath(location.pathname, item.to)))
  const activeItem = activeSection?.items.find((item) => matchesPath(location.pathname, item.to)) || null
  const unreadCount = unreadNotificationCount

  const fetchNotifications = () => {
    adminService.getNotifications()
      .then((response) => {
        setNotifications(response.data.notifications || [])
        setUnreadNotificationCount(response.data.unreadCount || 0)
      })
      .catch(() => {})
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

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
    <div className="min-h-screen bg-slate-50 text-slate-800">
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
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`navbar navbar-vertical ${menuOpen ? 'flex' : 'hidden'} lg:flex`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-emerald-200">
            <Link to="/admin/dashboard" className="navbar-brand">
              <img src={logo} alt="Vigan City Seal" className="h-10 w-10 rounded-xl border border-emerald-200 bg-[#edf8f2] p-1.5" />
              <div className="min-w-0">
                <div className="subheader">Scholarship Office</div>
                <div className="truncate text-base font-semibold text-slate-900">Admin Console</div>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {availableSections.map((section) => {
              const isOpen = openSections[section.id] ?? true
              const hasActiveItem = section.items.some((item) => matchesPath(location.pathname, item.to))

              return (
                <div key={section.id} className="mb-3 last:mb-0">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`mb-1 flex w-full items-center justify-between px-2 text-left ${hasActiveItem ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    <span className="subheader">{section.label}</span>
                    {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </button>

                  {isOpen && (
                    <ul className="navbar-nav">
                      {section.items.map(({ to, label, Icon, badgeKey }) => {
                        const badge = badgeKey ? navBadges[badgeKey] || 0 : 0
                        return (
                          <li key={to} className="nav-item">
                            <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{label}</span>
                              {badge > 0 && <span className="badge bg-danger-lt">{badge}</span>}
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

          <div className="border-t border-emerald-200 p-2.5">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-[#eef8f2] to-[#dceee5] p-2.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openProfileImagePicker}
                  disabled={uploadingProfileImage}
                  className="shrink-0 rounded-full transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label="Upload profile picture"
                >
                  {renderAvatar('avatar bg-emerald-200 text-slate-800')}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{user?.fullName || 'Administrator'}</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">{user?.role || 'Admin'}</p>
                  <button
                    type="button"
                    onClick={openProfileImagePicker}
                    disabled={uploadingProfileImage}
                    className="mt-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {uploadingProfileImage ? 'Uploading photo...' : 'Upload photo'}
                  </button>
                </div>
              </div>
              <button type="button" onClick={handleLogout} className="btn mt-2.5 w-full justify-center border-emerald-300 bg-[#f7fcf9] px-3 py-2 text-xs text-emerald-900 hover:bg-white">
                <LogoutIcon className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="page-wrapper">
        <header className="navbar sticky top-0 z-20 border-b-0 bg-gradient-to-r from-[#0b5d46] via-[#0e6f51] to-[#0f7f59] text-white shadow-lg backdrop-blur">
          <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white transition hover:bg-white/20 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open sidebar">
                  <MenuIcon className="h-4 w-4" />
                </button>

                <div>
                  <ol className="breadcrumb flex items-center gap-2 text-sm text-emerald-100/85" aria-label="breadcrumbs">
                    <li className="breadcrumb-item">
                      <Link to="/admin/dashboard" className="inline-flex items-center gap-1 hover:text-white">
                        <HomeIcon className="h-4 w-4" />
                        <span>Admin</span>
                      </Link>
                    </li>
                    {activeSection && <li className="breadcrumb-item">{activeSection.label}</li>}
                    {activeItem && <li className="breadcrumb-item font-medium text-white">{activeItem.label}</li>}
                  </ol>
                  <div className="mt-1 text-lg font-semibold text-white">{activeItem?.label || 'Dashboard'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <form onSubmit={handleSearchSubmit} className="hidden md:block">
                  <div className="input-icon w-72">
                    <input
                      type="search"
                      className="form-control border-white/15 bg-white/10 text-white placeholder:text-emerald-100/70 focus:border-white/25 focus:ring-white/10"
                      placeholder="Search pages or applicants"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    <span className="input-icon-addon text-emerald-100/70">
                      <SearchIcon className="h-4 w-4" />
                    </span>
                  </div>
                </form>

                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    className="relative inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white transition hover:bg-white/20"
                    onClick={() => setNotifOpen((current) => !current)}
                    aria-label="Notifications"
                  >
                    <BellIcon className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="dropdown-card absolute right-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)]">
                      <div className="card-header">
                        <div>
                          <div className="subheader">Updates</div>
                          <div className="card-title">Notifications</div>
                        </div>
                        {unreadCount > 0 && (
                          <button type="button" onClick={handleMarkAllRead} className="btn btn-ghost-secondary px-2 py-1 text-xs">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-5 py-8 text-center text-sm text-slate-500">No notifications</p>
                        ) : (
                          notifications.map((notification) => (
                            <button
                              type="button"
                              key={notification.id}
                              onClick={() => handleNotifClick(notification)}
                              className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${notification.isRead ? '' : 'bg-blue-50/60'}`}
                            >
                              <div className="flex items-start gap-3">
                                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.isRead ? 'bg-slate-200' : 'bg-blue-500'}`} />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                                  <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-white md:flex">
                  <button
                    type="button"
                    onClick={openProfileImagePicker}
                    disabled={uploadingProfileImage}
                    className="shrink-0 rounded-full transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                    aria-label="Upload profile picture"
                  >
                    {renderAvatar('avatar h-9 w-9 bg-white/15 text-white')}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">{user?.fullName || 'Administrator'}</p>
                    <p className="truncate text-xs text-emerald-100/80">{user?.email || 'admin@scholarship.local'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <form onSubmit={handleSearchSubmit}>
                <div className="input-icon">
                  <input
                    type="search"
                    className="form-control border-white/15 bg-white/10 text-white placeholder:text-emerald-100/70 focus:border-white/25 focus:ring-white/10"
                    placeholder="Search pages or applicants"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <span className="input-icon-addon text-emerald-100/70">
                    <SearchIcon className="h-4 w-4" />
                  </span>
                </div>
              </form>
            </div>
          </div>
        </header>

        <main className="page-body">
          <Outlet />
        </main>
      </div>

      {menuOpen && (
        <button
          type="button"
          className="fixed right-4 top-4 z-50 rounded-full border border-white/20 bg-[#0e6f51] p-2 text-white shadow-lg lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close sidebar"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
