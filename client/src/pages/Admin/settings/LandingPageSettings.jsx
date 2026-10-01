import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../../services/adminService'
import { DEFAULT_STATS_AWARDED } from './shared'

const initialForm = {
  facebookPageName: '',
  facebookPageUrl: '',
  facebookPageDescription: '',
  statsAwarded: DEFAULT_STATS_AWARDED,
  statsScholars: '882+',
  statsSchools: '5',
  statsSuccessRate: '94%',
}

export default function LandingPageSettings() {
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
          statsAwarded: data.settings?.statsAwarded || DEFAULT_STATS_AWARDED,
          statsScholars: data.settings?.statsScholars || '882+',
          statsSchools: data.settings?.statsSchools || '5',
          statsSuccessRate: data.settings?.statsSuccessRate || '94%',
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
    setSaving(true)
    try {
      const { data } = await adminService.updateLandingSettings(form)
      setForm({
        facebookPageName: data.settings?.facebookPageName || '',
        facebookPageUrl: data.settings?.facebookPageUrl || '',
        facebookPageDescription: data.settings?.facebookPageDescription || '',
        statsAwarded: data.settings?.statsAwarded || DEFAULT_STATS_AWARDED,
        statsScholars: data.settings?.statsScholars || '882+',
        statsSchools: data.settings?.statsSchools || '5',
        statsSuccessRate: data.settings?.statsSuccessRate || '94%',
      })
      toast.success(data.message || 'Landing page settings saved.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <section className="portal-surface p-6">
        <div className="mb-5">
          <h2 className=" text-lg font-semibold text-brand-primary">Social Links</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add the official Facebook page applicants should follow for announcements and updates.
          </p>
        </div>

        {loading ? (
          <div className="portal-panel p-4 text-sm text-slate-500">Loading landing page settings...</div>
        ) : (
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Facebook Page Name</label>
              <input
                type="text"
                className="portal-input"
                placeholder="Vigan City PH"
                value={form.facebookPageName}
                onChange={(e) => setField('facebookPageName', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Facebook Page URL</label>
              <input
                type="url"
                className="portal-input"
                placeholder="https://www.facebook.com/your-page"
                value={form.facebookPageUrl}
                onChange={(e) => setField('facebookPageUrl', e.target.value)}
              />
              <p className="mt-2 text-xs text-slate-500">
                Required if you want the landing page to show the Facebook follow section.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Short Description</label>
              <textarea
                className="portal-input min-h-[110px] resize-y"
                placeholder="Follow the official page for scholarship announcements, schedules, and public updates."
                value={form.facebookPageDescription}
                onChange={(e) => setField('facebookPageDescription', e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="portal-surface p-6">
        <div className="mb-5">
          <h2 className=" text-lg font-semibold text-brand-primary">Statistics Banner</h2>
          <p className="mt-2 text-sm text-slate-500">
            Update the highlight numbers shown in the stats band on the landing page.
          </p>
        </div>

        {loading ? (
          <div className="portal-panel p-4 text-sm text-slate-500">Loading statistics settings...</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Total Awarded</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder={DEFAULT_STATS_AWARDED}
                  value={form.statsAwarded}
                  onChange={(e) => setField('statsAwarded', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">e.g. {DEFAULT_STATS_AWARDED}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Active Scholars</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="882+"
                  value={form.statsScholars}
                  onChange={(e) => setField('statsScholars', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">e.g. 882+</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Partner Schools</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="5"
                  value={form.statsSchools}
                  onChange={(e) => setField('statsSchools', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">e.g. 5</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Success Rate</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="94%"
                  value={form.statsSuccessRate}
                  onChange={(e) => setField('statsSuccessRate', e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">e.g. 94%</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Save only the landing page content shown in this section.</p>
              <button onClick={handleSave} disabled={saving} className="portal-button-primary justify-center">
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {saving ? 'Saving...' : 'Save Landing Page Settings'}
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  )
}
