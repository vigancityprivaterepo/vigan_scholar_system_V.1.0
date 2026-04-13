import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/shared/StatusBadge'
import { formatDate } from '../../utils/formatDate'
import { SearchIcon } from '../../components/ui/PortalIcons'

const ALL_STATUSES = ['PENDING_REVIEW', 'INCOMPLETE', 'ELIGIBILITY_SCREENING', 'NOT_QUALIFIED', 'EXAM_INTERVIEW', 'FAILED_EXAM', 'APPROVED', 'COR_SUBMITTED', 'COR_REJECTED', 'ACCEPTED', 'REJECTED']
const EMAIL_TEMPLATES = [
  {
    id: 'accepted',
    label: 'Accepted Applicants',
    status: 'ACCEPTED',
    subject: 'Congratulations! You are officially accepted to the Vigan Scholarship Program',
    greeting: 'Greetings from the City Government of Vigan Scholarship Office.',
    message:
      'Congratulations on being accepted to the Vigan Scholarship Program.\n\nPlease continue monitoring your applicant portal for scholarship orientation schedules and further instructions.\n\nWe are proud of your achievement and look forward to supporting your academic journey.',
  },
  {
    id: 'notQualified',
    label: 'Not Qualified Applicants',
    status: 'NOT_QUALIFIED',
    subject: 'Scholarship Application Update: Eligibility Result',
    greeting: 'Greetings from the City Government of Vigan Scholarship Office.',
    message:
      'Thank you for applying to the Vigan Scholarship Program.\n\nAfter review, your application did not meet the eligibility requirements for this cycle.\n\nYou may check future announcements and reapply in the next scholarship period if eligible.',
  },
  {
    id: 'approved',
    label: 'Approved (Submit COR)',
    status: 'APPROVED',
    subject: 'Your application is approved - please submit your COR',
    greeting: 'Greetings from the City Government of Vigan Scholarship Office.',
    message:
      'Your scholarship application has been approved.\n\nPlease submit your Certificate of Registration (COR) in the portal to proceed with final acceptance.\n\nSubmit as soon as possible to avoid delays.',
  },
  {
    id: 'custom',
    label: 'Custom Message',
    status: '',
    subject: '',
    greeting: 'Greetings from the Scholarship Office.',
    message: '',
  },
]

export default function BulkEmail() {
  const currentYear = new Date().getFullYear()
  const defaultFrom = `${currentYear}-01-01`
  const defaultTo = `${currentYear}-12-31`

  const [data, setData] = useState({ applications: [], pagination: { total: 0, pages: 1 } })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [submittedFrom, setSubmittedFrom] = useState(defaultFrom)
  const [submittedTo, setSubmittedTo] = useState(defaultTo)
  const [sortBy, setSortBy] = useState('submittedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const [selectedIds, setSelectedIds] = useState([])
  const [emailScope, setEmailScope] = useState('selected')
  const [selectedTemplate, setSelectedTemplate] = useState('custom')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailGreeting, setEmailGreeting] = useState('Greetings from the Scholarship Office.')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [previewSummary, setPreviewSummary] = useState({ count: 0, maxRecipients: 0, exceedsMax: false })
  const [previewRecipients, setPreviewRecipients] = useState([])
  const [historyData, setHistoryData] = useState({ logs: [], pagination: { page: 1, pages: 1, total: 0, limit: 10 } })
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historySearch, setHistorySearch] = useState('')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [activeSection, setActiveSection] = useState('audience')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20, sortBy, sortOrder }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (submittedFrom) params.submittedFrom = submittedFrom
      if (submittedTo) params.submittedTo = submittedTo
      const r = await adminService.listApplications(params)
      setData(r.data)
    } catch {
      toast.error('Failed to load applicants')
    }
    setLoading(false)
  }, [page, search, sortBy, sortOrder, statusFilter, submittedFrom, submittedTo])

  useEffect(() => { fetchData() }, [fetchData])
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const params = { page: historyPage, limit: 10 }
      if (historySearch.trim()) params.search = historySearch.trim()
      if (historyFrom) params.sentFrom = historyFrom
      if (historyTo) params.sentTo = historyTo
      const r = await adminService.getBulkEmailLogs(params)
      setHistoryData(r.data)
    } catch {
      toast.error('Failed to load bulk email history')
    }
    setHistoryLoading(false)
  }, [historyFrom, historyPage, historySearch, historyTo])

  useEffect(() => { fetchHistory() }, [fetchHistory])
  useEffect(() => {
    setPreviewSummary({ count: 0, maxRecipients: 0, exceedsMax: false })
    setPreviewRecipients([])
  }, [emailScope, selectedIds, search, statusFilter, submittedFrom, submittedTo])

  const visibleIds = useMemo(() => data.applications.map((app) => app.id), [data.applications])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedVisibleCount = useMemo(() => visibleIds.filter((id) => selectedSet.has(id)).length, [visibleIds, selectedSet])
  const isAllVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const filteredRecipientCount = useMemo(() => {
    if (!statusFilter && !search.trim() && !submittedFrom && !submittedTo) return 0
    return data.pagination.total || 0
  }, [data.pagination.total, search, statusFilter, submittedFrom, submittedTo])

  const toggleSelect = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id)
      return [...current, id]
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedIds((current) => {
      if (isAllVisibleSelected) return current.filter((id) => !visibleIds.includes(id))
      const merged = new Set([...current, ...visibleIds])
      return [...merged]
    })
  }

  const applyTemplate = (templateId) => {
    const template = EMAIL_TEMPLATES.find((item) => item.id === templateId)
    if (!template) return

    setSelectedTemplate(templateId)
    setEmailSubject(template.subject)
    setEmailGreeting(template.greeting)
    setEmailMessage(template.message)

    if (template.status) {
      setStatusFilter(template.status)
      setPage(1)
    }
  }

  const buildRecipientPayload = () => {
    const usingSelected = emailScope === 'selected'
    if (usingSelected) {
      return { applicationIds: selectedIds }
    }
    return {
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      submittedFrom: submittedFrom || undefined,
      submittedTo: submittedTo || undefined,
    }
  }

  const runPreviewRecipients = async () => {
    try {
      setPreviewLoading(true)
      const payload = buildRecipientPayload()
      const { data: response } = await adminService.previewBulkEmailRecipients(payload)
      setPreviewSummary(response.summary || { count: 0, maxRecipients: 0, exceedsMax: false })
      setPreviewRecipients(response.recipients || [])
      toast.success(`Preview loaded: ${response.summary?.count || 0} recipient(s).`)
    } catch (err) {
      setPreviewSummary({ count: 0, maxRecipients: 0, exceedsMax: false })
      setPreviewRecipients([])
      toast.error(err.response?.data?.message || 'Failed to preview recipients.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const runSendTest = async () => {
    if (!emailSubject.trim()) {
      toast.error('Email subject is required.')
      return
    }
    if (!emailMessage.trim()) {
      toast.error('Email message is required.')
      return
    }

    try {
      setTestLoading(true)
      const { data: response } = await adminService.sendBulkEmailTest({
        subject: emailSubject.trim(),
        greeting: emailGreeting.trim() || undefined,
        message: emailMessage.trim(),
      })
      toast.success(response.message || 'Test email sent.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email.')
    } finally {
      setTestLoading(false)
    }
  }

  const runBulkEmail = async () => {
    if (submittedFrom && submittedTo && submittedFrom > submittedTo) {
      toast.error('Submitted From cannot be later than Submitted To.')
      return
    }

    if (!emailSubject.trim()) {
      toast.error('Email subject is required.')
      return
    }
    if (!emailMessage.trim()) {
      toast.error('Email message is required.')
      return
    }

    const usingSelected = emailScope === 'selected'
    if (usingSelected && selectedIds.length === 0) {
      toast.error('Select at least one application, or switch to filtered recipients.')
      return
    }
    if (!usingSelected && !statusFilter && !search.trim() && !submittedFrom && !submittedTo) {
      toast.error('Set a status/search/date filter first.')
      return
    }

    const recipientCount = usingSelected ? selectedIds.length : filteredRecipientCount
    if (recipientCount === 0) {
      toast.error('No recipients found for the selected scope.')
      return
    }

    const yes = window.confirm(`Send this email to ${recipientCount} applicant(s)?`)
    if (!yes) return

    setEmailLoading(true)
    try {
      const payload = {
        subject: emailSubject.trim(),
        greeting: emailGreeting.trim() || undefined,
        message: emailMessage.trim(),
        ...buildRecipientPayload(),
      }

      const { data: response } = await adminService.bulkEmailApplicants(payload)
      const sent = response.summary?.sent || 0
      const skipped = response.summary?.skipped || 0

      if (sent > 0) toast.success(`Email sent to ${sent} applicant(s).`)
      if (skipped > 0) {
        const preview = response.skipped?.slice(0, 2).map((item) => item.reason).join(' | ')
        toast.error(`Skipped ${skipped} applicant(s). ${preview || ''}`.trim())
      }
      fetchHistory()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk email failed.')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="portal-kicker">Communications</p>
          <h1 className="portal-page-title mt-2">Bulk Email Applicants</h1>
          <p className="portal-page-subtitle">Send one message to selected applicants or a filtered group by status/search.</p>
        </div>
        <Link to="/admin/applicants" className="portal-button-secondary whitespace-nowrap !px-4 !py-2 text-sm">
          Back to Applicants
        </Link>
      </div>

      <div className="portal-surface p-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'audience', label: '1. Audience' },
            { id: 'compose', label: '2. Compose' },
            { id: 'review', label: '3. Review & Send' },
            { id: 'history', label: '4. History' },
          ].map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                activeSection === section.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className={clsx('portal-surface p-5', activeSection !== 'audience' && 'hidden')}>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="portal-input pl-10"
              placeholder="Search by name, email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <button onClick={fetchData} className="portal-button-primary whitespace-nowrap">Search</button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="whitespace-nowrap text-xs text-slate-500">Filter:</span>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="portal-input w-auto"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Submitted From</span>
            <input
              type="date"
              className="portal-input"
              value={submittedFrom}
              max={submittedTo || undefined}
              onChange={(e) => { setSubmittedFrom(e.target.value); setPage(1) }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Submitted To</span>
            <input
              type="date"
              className="portal-input"
              value={submittedTo}
              min={submittedFrom || undefined}
              onChange={(e) => { setSubmittedTo(e.target.value); setPage(1) }}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">Default range is the current year so older application batches (e.g., last year) are excluded unless you change the dates.</p>

        <div className="mt-4 flex justify-end">
          <button type="button" className="portal-button-primary" onClick={() => setActiveSection('compose')}>
            Next: Compose Email
          </button>
        </div>
      </div>

      <div className={clsx('portal-surface border border-sky-200 bg-sky-50 p-5', !['compose', 'review'].includes(activeSection) && 'hidden')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Bulk Email</p>
            <p className="mt-1 text-sm text-sky-900">
              {emailScope === 'selected'
                ? `${selectedIds.length} selected applicant(s)`
                : `${filteredRecipientCount} applicant(s) in current filter`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900"
          >
            Clear Selection
          </button>
        </div>

        {activeSection === 'compose' && (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                className="portal-input"
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
              >
                {EMAIL_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </select>
              <select className="portal-input" value={emailScope} onChange={(e) => setEmailScope(e.target.value)}>
                <option value="selected">Recipients: Selected applications</option>
                <option value="filtered">Recipients: Current status/search filter</option>
              </select>
              <input
                type="text"
                className="portal-input"
                placeholder="Email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
              <textarea
                className="portal-input md:col-span-2"
                rows={2}
                placeholder="Greeting (optional)"
                value={emailGreeting}
                onChange={(e) => setEmailGreeting(e.target.value)}
              />
              <textarea
                className="portal-input md:col-span-2"
                rows={5}
                placeholder="Write your message..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
            <div className="mt-3 flex justify-between">
              <button type="button" className="portal-button-secondary" onClick={() => setActiveSection('audience')}>
                Back: Audience
              </button>
              <button type="button" className="portal-button-primary" onClick={() => setActiveSection('review')}>
                Next: Review & Send
              </button>
            </div>
          </>
        )}

        {activeSection === 'review' && (
          <>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={runPreviewRecipients}
                disabled={previewLoading}
                className="portal-button-secondary"
              >
                {previewLoading ? 'Loading Preview...' : 'Preview Recipients'}
              </button>
              <button
                type="button"
                onClick={runSendTest}
                disabled={testLoading}
                className="portal-button-secondary"
              >
                {testLoading ? 'Sending Test...' : 'Send Test Email to Me'}
              </button>
              <button
                type="button"
                onClick={runBulkEmail}
                disabled={emailLoading}
                className="portal-button-primary"
              >
                {emailLoading ? 'Sending...' : 'Send Bulk Email'}
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-sky-200 bg-white p-3">
              <p className="text-xs text-slate-700">
                Preview Count: <strong>{previewSummary.count || 0}</strong>
                {previewSummary.maxRecipients ? ` / Max per send: ${previewSummary.maxRecipients}` : ''}
              </p>
              {previewSummary.exceedsMax && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Recipient count exceeds the allowed limit. Narrow your filters before sending.
                </p>
              )}
              {previewRecipients.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1 pr-2">Name</th>
                        <th className="py-1 pr-2">Email</th>
                        <th className="py-1 pr-2">Status</th>
                        <th className="py-1">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRecipients.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="py-1 pr-2 text-slate-700">{item.applicant?.fullName || '-'}</td>
                          <td className="py-1 pr-2 text-slate-600">{item.applicant?.email || '-'}</td>
                          <td className="py-1 pr-2 text-slate-600">{String(item.status || '').replaceAll('_', ' ')}</td>
                          <td className="py-1 text-slate-500">{formatDate(item.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-between">
              <button type="button" className="portal-button-secondary" onClick={() => setActiveSection('compose')}>
                Back: Compose
              </button>
              <button type="button" className="portal-button-secondary" onClick={() => setActiveSection('history')}>
                Go to History
              </button>
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-slate-600">All bulk emails use the official branded email template with the Vigan logo.</p>
      </div>

      <div className={clsx('portal-surface overflow-hidden p-0', activeSection !== 'audience' && 'hidden')}>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={isAllVisibleSelected} onChange={toggleSelectAllVisible} aria-label="Select all visible" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">GWA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[1, 2, 3, 4, 5].map(j => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : data.applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <p>No applications found</p>
                  </td>
                </tr>
              ) : (
                data.applications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(app.id)}
                        onChange={() => toggleSelect(app.id)}
                        aria-label={`Select ${app.applicant?.fullName || app.id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-brand-primary">{app.applicant?.fullName}</p>
                      <p className="text-xs text-slate-500">{app.applicant?.email}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} size="sm" /></td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-mono text-sm font-bold', app.gwa && parseFloat(app.gwa) <= 2.0 ? 'text-green-600' : app.gwa ? 'text-red-500' : 'text-slate-400')}>
                        {app.gwa ? parseFloat(app.gwa).toFixed(2) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(app.submittedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.pagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Page {page} of {data.pagination.pages} • {data.pagination.total} results</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Prev</button>
              <button disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)} className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <div className={clsx('portal-surface p-5', activeSection !== 'history' && 'hidden')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="portal-kicker">Audit Trail</p>
            <h2 className="portal-page-title mt-2 text-xl">Bulk Email History</h2>
            <p className="portal-page-subtitle">{historyData.pagination?.total || 0} log entries</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="portal-input md:col-span-2"
            placeholder="Search by subject, sender, recipient..."
            value={historySearch}
            onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1) }}
          />
          <input
            type="date"
            className="portal-input"
            value={historyFrom}
            max={historyTo || undefined}
            onChange={(e) => { setHistoryFrom(e.target.value); setHistoryPage(1) }}
          />
          <input
            type="date"
            className="portal-input"
            value={historyTo}
            min={historyFrom || undefined}
            onChange={(e) => { setHistoryTo(e.target.value); setHistoryPage(1) }}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={fetchHistory} className="portal-button-secondary">Refresh History</button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Sent At</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Sender</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <td key={j} className="px-3 py-2"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : historyData.logs?.length ? (
                historyData.logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-600">{formatDate(log.createdAt)}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      <p className="font-medium">{log.performedBy?.fullName || '-'}</p>
                      <p className="text-slate-500">{log.performedBy?.email || '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      <p className="font-medium">{log.application?.applicant?.fullName || '-'}</p>
                      <p className="text-slate-500">{log.application?.applicant?.email || '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{String(log.application?.status || '-').replaceAll('_', ' ')}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{log.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">No bulk email logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {historyData.pagination?.pages > 1 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Page {historyData.pagination.page} of {historyData.pagination.pages} • {historyData.pagination.total} logs
            </p>
            <div className="flex gap-2">
              <button
                disabled={historyPage === 1}
                onClick={() => setHistoryPage((p) => p - 1)}
                className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={historyPage >= historyData.pagination.pages}
                onClick={() => setHistoryPage((p) => p + 1)}
                className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
