import React from 'react'

function IconBase({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function PortalSealMark({ small = false }) {
  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center rounded-full border-4 border-white/75 bg-white/95 text-brand-primary shadow-sm',
        small ? 'h-12 w-12' : 'h-16 w-16',
      ].join(' ')}
      aria-hidden="true"
    >
      <div
        className={[
          'flex items-center justify-center rounded-full border border-brand-primary/25 bg-slate-50 text-center',
          small ? 'h-8 w-8 text-[7px]' : 'h-11 w-11 text-[9px]',
        ].join(' ')}
      >
        <span className="font-mono font-semibold uppercase tracking-[0.18em] text-brand-primary/75">Vigan</span>
      </div>
    </div>
  )
}

export function HomeIcon(props) { return <IconBase {...props}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" /></IconBase> }
export function FileTextIcon(props) { return <IconBase {...props}><path d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" /><path d="M14 3.5V8h4" /><path d="M9 11h6" /><path d="M9 15h6" /></IconBase> }
export function ChartIcon(props) { return <IconBase {...props}><path d="M4.5 19.5h15" /><path d="M7.5 16V9.5" /><path d="M12 16V6.5" /><path d="M16.5 16v-4.5" /></IconBase> }
export function BellIcon(props) { return <IconBase {...props}><path d="M7.5 17.5h9l-1.2-1.6V11a3.3 3.3 0 0 0-2.8-3.3V6.8a.5.5 0 0 0-1 0v.9A3.3 3.3 0 0 0 8.7 11v4.9Z" /><path d="M10.5 19a1.7 1.7 0 0 0 3 0" /></IconBase> }
export function DocumentIcon(props) { return <IconBase {...props}><rect x="5" y="4" width="14" height="16" rx="1.5" /><path d="M8.5 9h7" /><path d="M8.5 13h7" /><path d="M8.5 17H13" /></IconBase> }
export function UsersIcon(props) { return <IconBase {...props}><path d="M16.5 19.5v-1.2a3.3 3.3 0 0 0-3.3-3.3h-2.4a3.3 3.3 0 0 0-3.3 3.3v1.2" /><circle cx="12" cy="9" r="3" /><path d="M18.5 8.5a2.5 2.5 0 0 1 0 5" /><path d="M5.5 13.5a2.5 2.5 0 0 1 0-5" /></IconBase> }
export function CheckCircleIcon(props) { return <IconBase {...props}><circle cx="12" cy="12" r="8.5" /><path d="m8.8 12.2 2.1 2.1 4.4-4.6" /></IconBase> }
export function ClipboardIcon(props) { return <IconBase {...props}><path d="M9 4.5h6" /><path d="M9.5 3h5A1.5 1.5 0 0 1 16 4.5V6H8V4.5A1.5 1.5 0 0 1 9.5 3Z" /><path d="M8 5.5H6.5A1.5 1.5 0 0 0 5 7v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V7a1.5 1.5 0 0 0-1.5-1.5H16" /></IconBase> }
export function CogIcon(props) { return <IconBase {...props}><path d="m12 4 1 .6 1.2-.2.8 1 .9.6-.1 1.2.6 1 .9.7-.4 1.1.4 1.1-.9.7-.6 1 .1 1.2-.9.6-.8 1-1.2-.2-1 .6-1-.6-1.2.2-.8-1-.9-.6.1-1.2-.6-1-.9-.7.4-1.1-.4-1.1.9-.7.6-1-.1-1.2.9-.6.8-1 1.2.2Z" /><circle cx="12" cy="12" r="2.7" /></IconBase> }
export function LogoutIcon(props) { return <IconBase {...props}><path d="M10 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H10" /><path d="M14 16.5 19 12l-5-4.5" /><path d="M19 12H9" /></IconBase> }
export function MenuIcon(props) { return <IconBase {...props}><path d="M4 7.5h16" /><path d="M4 12h16" /><path d="M4 16.5h16" /></IconBase> }
export function ChevronLeftIcon(props) { return <IconBase {...props}><path d="m14.5 6-6 6 6 6" /></IconBase> }
export function ChevronRightIcon(props) { return <IconBase {...props}><path d="m9.5 6 6 6-6 6" /></IconBase> }
export function ChevronUpIcon(props) { return <IconBase {...props}><path d="m6 15 6-6 6 6" /></IconBase> }
export function ChevronDownIcon(props) { return <IconBase {...props}><path d="m6 9 6 6 6-6" /></IconBase> }
export function ShieldCheckIcon(props) { return <IconBase {...props}><path d="M12 3.5c2 1.6 4.4 2.3 6.5 2.6v5.4c0 4.3-2.6 7.5-6.5 9-3.9-1.5-6.5-4.7-6.5-9V6.1c2.1-.3 4.5-1 6.5-2.6Z" /><path d="m9.5 12.5 1.8 1.8 3.7-3.8" /></IconBase> }
export function GraduationCapIcon(props) { return <IconBase {...props}><path d="m3.5 9 8.5-4 8.5 4-8.5 4-8.5-4Z" /><path d="M7.5 11.1V15c0 .7 2 2 4.5 2s4.5-1.3 4.5-2v-3.9" /><path d="M20.5 10v4.5" /></IconBase> }
export function InfoIcon(props) { return <IconBase {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v4" /><path d="M12 7.7h.01" /></IconBase> }
export function AlertTriangleIcon(props) { return <IconBase {...props}><path d="M12 4.5 20 19H4l8-14.5Z" /><path d="M12 9.5v4" /><path d="M12 16h.01" /></IconBase> }
export function ClockIcon(props) { return <IconBase {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3 2" /></IconBase> }
export function ArrowRightIcon(props) { return <IconBase {...props}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></IconBase> }
export function SearchIcon(props) { return <IconBase {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></IconBase> }
export function MailIcon(props) { return <IconBase {...props}><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="m4.5 7 7.5 6 7.5-6" /></IconBase> }
export function CalendarIcon(props) { return <IconBase {...props}><rect x="4" y="5.5" width="16" height="14" rx="1.5" /><path d="M8 3.5v4" /><path d="M16 3.5v4" /><path d="M4 9.5h16" /></IconBase> }
export function UploadIcon(props) { return <IconBase {...props}><path d="M12 15V5" /><path d="m8.5 8.5 3.5-3.5 3.5 3.5" /><path d="M5 18.5h14" /></IconBase> }
export function XIcon(props) { return <IconBase {...props}><path d="m6 6 12 12" /><path d="M18 6 6 18" /></IconBase> }
export function PhotoIcon(props) { return <IconBase {...props}><rect x="4" y="4" width="16" height="16" rx="1.5" /><circle cx="9" cy="9.5" r="1.5" /><path d="m4 16 4.5-5 3.5 4 2.5-3 5.5 4" /></IconBase> }
export function DatabaseIcon(props) { return <IconBase {...props}><ellipse cx="12" cy="6.5" rx="7.5" ry="2.5" /><path d="M4.5 6.5v4c0 1.38 3.358 2.5 7.5 2.5s7.5-1.12 7.5-2.5v-4" /><path d="M4.5 10.5v4c0 1.38 3.358 2.5 7.5 2.5s7.5-1.12 7.5-2.5v-4" /></IconBase> }
