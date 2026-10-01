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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="portal-page-title">Notifications</h1>
          <p className="portal-page-subtitle">{notifications.filter(n => !n.isRead).length} unread</p>
        </div>
        <button onClick={handleMarkAllRead} className="text-sm font-medium text-brand-primary hover:underline">Mark all read</button>
      </div>

      <div className="portal-surface mb-6 p-1">
        <div className="flex gap-1">
          {['all', 'unread', 'read'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={clsx(
                'portal-tab flex-1 capitalize',
                filter === f ? 'bg-brand-primary text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-brand-primary'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="card h-20 animate-pulse bg-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="portal-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
            <BellIcon className="h-6 w-6" />
          </div>
          <p className="mt-4 font-semibold text-brand-primary">No {filter !== 'all' ? filter : ''} notifications</p>
          <p className="mt-1 text-sm text-slate-500">The scholarship office notifies you here whenever your application status changes.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(n => {
            const Icon = iconFor(n.type)
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                aria-label={n.isRead ? undefined : `${n.title} (unread, select to mark as read)`}
                className={clsx(
                  'portal-surface flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-slate-50',
                  !n.isRead && 'bg-teal-50/40'
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx('text-sm text-brand-primary', n.isRead ? 'font-medium' : 'font-semibold')}>{n.title}</p>
                    {!n.isRead && <span className="shrink-0 text-xs font-semibold text-teal-700">Unread</span>}
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{n.message}</p>
                  <p className="mt-1.5 text-xs text-slate-500">{fromNow(n.createdAt)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
