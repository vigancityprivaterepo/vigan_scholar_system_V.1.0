import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { applicationService } from '../../services/applicationService'
import HelpSheet from '../../components/applicant/HelpSheet'
import { ChevronRightIcon, LogoutIcon } from '../../components/ui/PortalIcons'

// Phone "More" tab: everything that is not Home, Status or Updates.
export default function MorePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [application, setApplication] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    applicationService.getMine()
      .then((r) => setApplication(r.data.application))
      .catch(() => {})
  }, [])

  const status = application?.status
  const corOpen = status === 'APPROVED' || status === 'COR_REJECTED'
  const isScholar = status === 'ACCEPTED'

  const items = [
    { to: '/applicant/profile', icon: 'P', label: 'Profile', sub: 'Name and contact number' },
    ...(!application || status === 'INCOMPLETE'
      ? [{ to: '/applicant/apply', icon: 'A', label: application ? 'Resubmit application' : 'Apply', sub: 'Five short steps' }]
      : []),
    ...(!application ? [{ to: '/applicant/eligibility', icon: 'E', label: 'Check eligibility', sub: '5 yes/no questions, 1 minute' }] : []),
    {
      to: '/applicant/cor',
      icon: 'C',
      label: 'Submit COR',
      sub: 'Certificate of registration',
      tag: corOpen ? (status === 'COR_REJECTED' ? 'Returned' : 'Due') : null,
      tagClass: status === 'COR_REJECTED' ? 'bg-status-warn-bg text-status-warn-fg' : 'bg-emerald-100 text-emerald-800',
    },
    {
      to: '/applicant/renewal',
      icon: 'R',
      label: 'Renew scholarship',
      sub: 'For accepted scholars',
      tag: isScholar ? 'Open' : null,
      tagClass: 'bg-emerald-100 text-emerald-800',
    },
  ]

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully.')
    navigate('/login')
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="portal-page-title">More</h1>

      <div className="shrink-0 overflow-hidden rounded-[20px] bg-white shadow-card">
        {items.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className="press flex min-h-16 animate-slide-up items-center gap-3.5 border-b border-slate-100 px-4 py-2.5 last:border-b-0 hover:bg-brand-bg"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-emerald-50 text-[15px] font-bold text-emerald-700" aria-hidden="true">{item.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-brand-primary">{item.label}</span>
              <span className="block text-sm text-slate-500">{item.sub}</span>
            </span>
            {item.tag && <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${item.tagClass}`}>{item.tag}</span>}
            <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="press flex shrink-0 items-center gap-3.5 rounded-[20px] bg-brand-primary p-4 text-left text-white shadow-[0_10px_24px_rgba(12,35,64,.2)]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-300/20 text-emerald-300" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></svg>
        </span>
        <span className="flex-1">
          <span className="block text-[17px] font-semibold">Common questions</span>
          <span className="block text-sm text-slate-300">Answers in seconds. Drag the sheet up for more.</span>
        </span>
      </button>

      <div className="flex shrink-0 flex-col gap-3 rounded-[20px] bg-white p-4 shadow-card">
        <p className="text-[17px] font-semibold text-brand-primary">Talk to a person</p>
        <p className="text-[15px] leading-normal text-slate-600">
          Scholarship Office, Vigan City Hall.
          {application && <> Quote your reference <strong className="text-brand-primary">#{application.id.slice(0, 8).toUpperCase()}</strong>.</>}
        </p>
        <Link to="/applicant/help" className="btn min-h-12 text-base">Open the help page</Link>
      </div>

      <button type="button" onClick={handleLogout} className="press flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-button border-[1.5px] border-slate-300 bg-white text-base font-semibold text-slate-700">
        <LogoutIcon className="h-4 w-4" /> Log out{user?.fullName ? ` (${user.fullName.split(' ')[0]})` : ''}
      </button>

      <HelpSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
