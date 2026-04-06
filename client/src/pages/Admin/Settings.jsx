import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'

const initialForm = {
  facebookPageName: '',
  facebookPageUrl: '',
  facebookPageDescription: '',
  gwaThreshold: '2.0',
  applicationOpen: true,
}

export default function AdminSettings() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await adminService.getSiteSettings()
        setForm({
          facebookPageName: data.settings?.facebookPageName || '',
          facebookPageUrl: data.settings?.facebookPageUrl || '',
          facebookPageDescription: data.settings?.facebookPageDescription || '',
          gwaThreshold: data.settings?.gwaThreshold != null ? String(data.settings.gwaThreshold) : '2.0',
          applicationOpen: data.settings?.applicationOpen !== false,
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
    if (isNaN(threshold) || threshold < 1.0 || threshold > 5.0) {
      toast.error('GWA threshold must be between 1.0 and 5.0.')
      return
    }
    setSaving(true)
    try {
      const { data } = await adminService.updateSiteSettings({
        ...form,
        gwaThreshold: threshold,
      })
      setForm({
        facebookPageName: data.settings?.facebookPageName || '',
        facebookPageUrl: data.settings?.facebookPageUrl || '',
        facebookPageDescription: data.settings?.facebookPageDescription || '',
        gwaThreshold: data.settings?.gwaThreshold != null ? String(data.settings.gwaThreshold) : '2.0',
        applicationOpen: data.settings?.applicationOpen !== false,
      })
      toast.success(data.message || 'Settings saved.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <p className="portal-kicker">Administrative Configuration</p>
        <h1 className="portal-page-title mt-2">Settings</h1>
      </div>

      <div className="portal-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-brand-primary">Scholarship Configuration</h2>
        <div className="flex flex-col gap-4">

          {/* GWA Threshold */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Minimum GWA Threshold</label>
            <p className="mb-2 text-xs text-slate-500">Applicants must have a GWA equal to or below this value (1.0 scale, lower is better). Used when qualifying applicants to the Exam/Interview stage.</p>
            <input
              type="number"
              className="portal-input max-w-xs"
              value={form.gwaThreshold}
              onChange={e => setField('gwaThreshold', e.target.value)}
              step="0.1"
              min="1.0"
              max="5.0"
            />
          </div>

          {/* Application Open/Close */}
          <div className="border-t border-slate-200 pt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Accept Applications</label>
            <p className="mb-3 text-xs text-slate-500">When turned off, the application form will be closed and new submissions will be blocked.</p>
            <button
              type="button"
              onClick={() => setField('applicationOpen', !form.applicationOpen)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.applicationOpen ? 'bg-[#10b981]' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.applicationOpen ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="ml-3 text-sm text-slate-600">{form.applicationOpen ? 'Open — accepting submissions' : 'Closed — submissions blocked'}</span>
          </div>

          {/* Facebook */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 font-medium text-brand-primary">Landing Page Socials</h3>
            <p className="mb-4 text-sm text-slate-500">
              Add the official Facebook page applicants should follow for announcements and updates.
            </p>

            {loading ? (
              <div className="portal-panel p-4 text-sm text-slate-500">Loading current social settings...</div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Facebook Page Name</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="Vigan City PH"
                    value={form.facebookPageName}
                    onChange={e => setField('facebookPageName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Facebook Page URL</label>
                  <input
                    type="url"
                    className="portal-input"
                    placeholder="https://www.facebook.com/your-page"
                    value={form.facebookPageUrl}
                    onChange={e => setField('facebookPageUrl', e.target.value)}
                  />
                  <p className="mt-2 text-xs text-slate-500">Required if you want the landing page to show the Facebook follow section.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Short Description</label>
                  <textarea
                    className="portal-input min-h-[110px] resize-y"
                    placeholder="Follow the official page for scholarship announcements, schedules, and public updates."
                    value={form.facebookPageDescription}
                    onChange={e => setField('facebookPageDescription', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* System Info */}
          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 font-medium text-brand-primary">System Info</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {[['Version', '1.0.0'], ['Environment', 'Development'], ['Database', 'PostgreSQL via Prisma'], ['Auth', 'JWT (Access + Refresh)']].map(([l, v]) => (
                <div key={l} className="portal-panel p-3">
                  <p className="text-xs text-slate-500">{l}</p>
                  <p className="font-medium text-brand-primary">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving || loading} className="portal-button-primary">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="portal-surface mt-6 p-6">
        <h2 className="mb-2 text-lg font-semibold text-brand-primary">Default Admin Credentials</h2>
        <p className="mb-4 text-xs text-slate-500">Created via database seed script</p>
        <div className="portal-panel p-4 font-mono text-sm">
          <p><span className="text-slate-500">Email:</span> admin@scholarship.edu.ph</p>
          <p><span className="text-slate-500">Pass:</span> Admin@2024</p>
        </div>
        <p className="mt-2 text-xs text-red-500">Change default credentials in production.</p>
      </div>
    </div>
  )
}
