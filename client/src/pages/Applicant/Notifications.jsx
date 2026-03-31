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
      .catch(() => {})
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
      toast.error('Failed')
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
          <p className="portal-kicker">Applicant Notifications</p>
          <h1 className="portal-page-title mt-2">Notifications</h1>
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
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(n => {
            const Icon = iconFor(n.type)
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                className={clsx(
                  'portal-surface flex cursor-pointer items-start gap-4 p-5 transition-all hover:shadow-md',
                  !n.isRead && 'border-l-4 border-brand-teal bg-teal-50/30'
                )}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-brand-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-brand-primary">{n.title}</p>
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-teal" />}
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{n.message}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{fromNow(n.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
