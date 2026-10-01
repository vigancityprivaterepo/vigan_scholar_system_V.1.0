import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../../services/adminService'
import { toDateTimeInput } from './shared'

const initialForm = {
  gwaThreshold: '83',
  applicationOpen: true,
  applicationDeadline: '',
}

export default function GeneralSettings() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await adminService.getSiteSettings()
        setForm({
          gwaThreshold: data.settings?.gwaThreshold != null ? String(data.settings.gwaThreshold) : '83',
          applicationOpen: data.settings?.applicationOpen !== false,
          applicationDeadline: toDateTimeInput(data.settings?.applicationDeadline),
        })
      } catch (err) {
        toast.error(err.response?.data?.message || 'Unable to load settings.')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    const threshold = parseFloat(form.gwaThreshold)
    if (Number.isNaN(threshold) || threshold < 50 || threshold > 99) {
      toast.error('General Average threshold must be between 50 and 99.')
      return
    }

    if (form.applicationDeadline) {
      const parsed = new Date(form.applicationDeadline)
      if (Number.isNaN(parsed.getTime())) {
        toast.error('Please enter a valid application deadline.')
        return
      }
    }

    setSaving(true)
    try {
      const { data } = await adminService.updateGeneralSettings({
        gwaThreshold: threshold,
        applicationOpen: form.applicationOpen,
        applicationDeadline: form.applicationDeadline ? new Date(form.applicationDeadline).toISOString() : null,
      })

      setForm({
        gwaThreshold: data.settings?.gwaThreshold != null ? String(data.settings.gwaThreshold) : '83',
        applicationOpen: data.settings?.applicationOpen !== false,
        applicationDeadline: toDateTimeInput(data.settings?.applicationDeadline),
      })
      toast.success(data.message || 'General settings saved.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="portal-surface p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-brand-primary">Scholarship Configuration</h2>
        <p className="mt-2 text-sm text-slate-500">Manage application rules and submission availability.</p>
      </div>

      {loading ? (
        <div className="portal-panel p-4 text-sm text-slate-500">Loading general settings...</div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Minimum General Average (%)</label>
              <p className="mb-2 text-xs text-slate-500">
                Applications below this General Average cannot be moved to Eligibility Screening or Exam / Interview.
                Reviewers still check the &ldquo;no grade lower than 80%&rdquo; rule on Form 138.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="portal-input max-w-[120px]"
                  value={form.gwaThreshold}
                  onChange={(e) => setField('gwaThreshold', e.target.value)}
                  step="1"
                  min="50"
                  max="99"
                />
                <span className="text-sm font-medium text-slate-600">%</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">Valid range: 50-99</p>
            </div>

            <div>
              <p id="accept-applications-label" className="mb-1 block text-sm font-medium text-slate-700">Accept Applications</p>
              <p className="mb-3 text-xs text-slate-500">Close submissions when applications should stop.</p>
              <button
                type="button"
                onClick={() => setField('applicationOpen', !form.applicationOpen)}
                role="switch"
                aria-checked={form.applicationOpen}
                aria-labelledby="accept-applications-label"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                  form.applicationOpen ? 'bg-[#10b981]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.applicationOpen ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="ml-3 text-sm text-slate-600">
                {form.applicationOpen ? 'Open - accepting submissions' : 'Closed - submissions blocked'}
              </span>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Application Deadline</label>
              <p className="mb-2 text-xs text-slate-500">
                Optional. After this date and time, applicants can no longer submit or resubmit forms.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="datetime-local"
                  className="portal-input max-w-sm"
                  value={form.applicationDeadline}
                  onChange={(e) => setField('applicationDeadline', e.target.value)}
                />
                {form.applicationDeadline && (
                  <button
                    type="button"
                    onClick={() => setField('applicationDeadline', '')}
                    className="text-left text-xs font-medium text-slate-500 hover:text-brand-primary"
                  >
                    Clear deadline
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">Save only the scholarship rule and application control changes shown here.</p>
            <button onClick={handleSave} disabled={saving} className="portal-button-primary justify-center">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {saving ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
