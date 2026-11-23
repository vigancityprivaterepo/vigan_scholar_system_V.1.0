import React, { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAppStore } from '../../store/appStore'
import { applicationService } from '../../services/applicationService'
import { fromNow } from '../../utils/formatDate'
import { AlertTriangleIcon, BellIcon, CheckCircleIcon, InfoIcon } from '../../components/ui/PortalIcons'

export default function NotificationsPage() {
  const { notifications, setNotifications, markRead, markAllRead } = useAppStore()
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    applicationService.getNotifications()
      .then(r => setNotifications(r.data.notifications))
      .catch(err => toast.error(err.response?.data?.message || 'Failed to load notifications.'))
      .finally(() => setLoading(false))
  }, [])

  const handleMarkRead = async (id) => {
    try {
      await applicationService.markRead(id)
      markRead(id)
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await applicationService.markAllRead()
      markAllRead()
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Could not mark notifications as read. Try again.')
    }
  }

  const filtered = notifications.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.isRead : n.isRead)
  const iconFor = (type) => {
    if (type === 'SUCCESS') return CheckCircleIcon
    if (type === 'WARNING') return AlertTriangleIcon
    if (type === 'ERROR') return AlertTriangleIcon
    return InfoIcon
  }

  const TAG = {
    SUCCESS: { label: 'Good news', className: 'text-emerald-700' },
    WARNING: { label: 'Action needed', className: 'text-amber-700' },
    ERROR: { label: 'Important', className: 'text-red-700' },
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="portal-page-title">Updates</h1>
          <p className="portal-page-subtitle">{notifications.filter(n => !n.isRead).length} unread</p>
        </div>
        <button type="button" onClick={handleMarkAllRead} className="min-h-11 text-[15px] font-semibold text-brand-teal hover:text-brand-dark">Mark all read</button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
        {['all', 'unread', 'read'].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className="chip capitalize">
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-[18px]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="portal-empty">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <BellIcon className="h-6 w-6" />
          </div>
          <p className="font-semibold text-brand-primary">No {filter !== 'all' ? filter : ''} updates</p>
          <p className="text-[15px] text-slate-500">The scholarship office notifies you here whenever your application status changes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((n, index) => {
            const tag = TAG[n.type] || { label: 'Update', className: 'text-slate-600' }
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                aria-label={n.isRead ? undefined : `${n.title} (unread, select to mark as read)`}
                className={clsx(
                  'press flex w-full shrink-0 animate-slide-up items-start gap-3 rounded-[18px] border p-4 text-left transition-colors duration-med',
                  n.isRead ? 'border-slate-200 bg-white' : 'border-emerald-200 bg-emerald-50'
                )}
                style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
              >
                <span
                  className={clsx('mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full bg-brand-teal transition-transform duration-med ease-spring', n.isRead ? 'scale-0' : 'scale-100')}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex justify-between gap-2">
                    <span className={clsx('text-sm font-semibold', tag.className)}>{tag.label}</span>
                    <span className="shrink-0 text-sm text-slate-500">{fromNow(n.createdAt)}</span>
                  </span>
                  <span className="text-base font-semibold leading-snug text-brand-primary">{n.title}</span>
                  <span className="text-[15px] leading-snug text-slate-600">{n.message}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
