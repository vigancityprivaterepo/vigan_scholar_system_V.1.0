import { NavLink, Outlet } from 'react-router-dom'

const items = [
  {
    to: '/admin/settings/general',
    label: 'General',
  },
  {
    to: '/admin/settings/landing',
    label: 'Landing Page',
  },
  {
    to: '/admin/settings/access',
    label: 'Access Management',
  },
  {
    to: '/admin/settings/schedule-audit',
    label: 'Schedule Audit',
  },
]

export default function SettingsLayout() {
  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <p className="portal-kicker">Administrative Configuration</p>
        <h1 className="portal-page-title mt-2">Settings</h1>
        <p className="portal-page-subtitle">Use focused sections instead of one long settings page.</p>
      </div>

      {/* Horizontal tab bar */}
      <nav
        className="mb-6 flex items-center gap-1 border-b border-slate-200 pb-0"
        aria-label="Settings sections"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex items-center gap-2 rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-primary text-white rounded-md mb-[-1px]'
                  : 'text-slate-600 hover:text-brand-primary hover:bg-slate-100 rounded-md'
              }`
            }
          >
            {({ isActive }) => (
              <span>{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
