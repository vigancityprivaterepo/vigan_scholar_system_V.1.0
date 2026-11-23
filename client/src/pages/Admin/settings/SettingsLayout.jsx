import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const items = [
  { to: '/admin/settings/general', label: 'General' },
  { to: '/admin/settings/landing', label: 'Public site' },
  { to: '/admin/settings/access', label: 'Staff access' },
  { to: '/admin/settings/schedule-audit', label: 'Audit log' },
]

export default function SettingsLayout() {
  const location = useLocation()
  const navRef = useRef(null)
  const [bar, setBar] = useState(null)

  // The underline slides to whichever tab is active.
  useEffect(() => {
    const measure = () => {
      const active = navRef.current?.querySelector('a.active')
      setBar(active ? { x: active.offsetLeft, w: active.offsetWidth } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [location.pathname])

  return (
    <div className="max-w-6xl">
      <div className="mb-5">
        <h1 className="portal-page-title">Settings</h1>
      </div>

      <nav ref={navRef} className="relative mb-6 flex items-center gap-1 overflow-x-auto border-b border-brand-line" aria-label="Settings sections">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-11 items-center whitespace-nowrap px-4 text-[15px] font-semibold transition-colors duration-fast ${
                isActive ? 'text-brand-dark' : 'text-slate-500 hover:text-brand-primary'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {bar && (
          <span
            className="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full bg-emerald-700 transition-[transform,width] duration-slow ease-spring"
            style={{ transform: `translateX(${bar.x}px)`, width: bar.w }}
            aria-hidden="true"
          />
        )}
      </nav>

      <Outlet />
    </div>
  )
}
