import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'

const EMPTY_FORM = { label: '', caption: '', sortOrder: '0', isActive: true }

function SlideForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(initial?.imageUrl || null)
  const fileRef = useRef()

  const isEdit = Boolean(initial?.id)

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      e.target.value = ''
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isEdit && !file) { toast.error('Please select an image'); return }
    if (!form.label.trim() || !form.caption.trim()) { toast.error('Label and caption are required'); return }

    const fd = new FormData()
    if (file) fd.append('image', file)
    fd.append('label', form.label.trim())
    fd.append('caption', form.caption.trim())
    fd.append('sortOrder', form.sortOrder)
    if (isEdit) fd.append('isActive', form.isActive)
    onSave(fd, initial?.id)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Image picker */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
          Slide Image {isEdit && <span className="font-normal normal-case text-slate-400">(leave blank to keep current)</span>}
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 border-dashed border-slate-300 bg-slate-50 py-6 text-slate-500 transition-colors hover:border-brand-primary hover:text-brand-primary"
        >
          {preview ? (
            <img src={preview} alt="preview" className="h-36 w-full object-cover rounded" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-slate-400">
                <rect x="4" y="4" width="16" height="16" rx="1.5" />
                <circle cx="9" cy="9.5" r="1.5" />
                <path d="m4 16 4.5-5 3.5 4 2.5-3 5.5 4" />
              </svg>
              <span className="text-sm">Click to upload image</span>
              <span className="text-xs text-slate-400">JPG, PNG, WebP — max 5 MB</span>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFile} />
      </div>

      {/* Label */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Slide Label / Title</label>
        <input
          type="text"
          className="portal-input"
          placeholder="e.g. Scholar Recognition Day"
          value={form.label}
          onChange={e => setField('label', e.target.value)}
          required
        />
      </div>

      {/* Caption */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Caption / Description</label>
        <textarea
          className="portal-input min-h-[80px] resize-y"
          placeholder="Short description shown below the title…"
          value={form.caption}
          onChange={e => setField('caption', e.target.value)}
          required
        />
      </div>

      {/* Sort order + active row */}
      <div className="flex flex-wrap gap-4">
        <div className="w-36">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Sort Order</label>
          <input
            type="number"
            min="0"
            className="portal-input"
            value={form.sortOrder}
            onChange={e => setField('sortOrder', e.target.value)}
          />
        </div>
        {isEdit && (
          <div className="flex items-end gap-2 pb-[3px]">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setField('isActive', e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-brand-primary"
              />
              Active (visible on landing page)
            </label>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-900 disabled:opacity-60"
        >
          {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {isEdit ? 'Save Changes' : 'Add Slide'}
        </button>
      </div>
    </form>
  )
}

export default function CarouselManagement() {
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null) // null | 'new' | { slide }
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const load = async () => {
    try {
      const { data } = await adminService.getCarouselSlides()
      setSlides(data.slides)
    } catch {
      toast.error('Failed to load slides')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (fd, id) => {
    setSaving(true)
    try {
      if (id) {
        await adminService.updateCarouselSlide(id, fd)
        toast.success('Slide updated')
      } else {
        await adminService.createCarouselSlide(fd)
        toast.success('Slide added')
      }
      setPanel(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slide')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      await adminService.deleteCarouselSlide(id)
      toast.success('Slide deleted')
      setSlides(s => s.filter(x => x.id !== id))
    } catch {
      toast.error('Failed to delete slide')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-teal">Portal VSMS</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-primary">Carousel Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the image slides displayed on the public landing page.</p>
        </div>
        {panel === null && (
          <button
            onClick={() => setPanel('new')}
            className="inline-flex items-center gap-2 rounded bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-900"
          >
            <span className="text-base leading-none">+</span> Add Slide
          </button>
        )}
      </div>

      {/* Add / Edit form panel */}
      {panel !== null && (
        <div className="border border-slate-300 bg-white shadow-sm">
          <div className="border-b border-slate-300 bg-slate-50 px-6 py-3">
            <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">
              {panel === 'new' ? 'New Slide' : 'Edit Slide'}
            </p>
          </div>
          <div className="p-6">
            <SlideForm
              initial={panel === 'new' ? null : panel.slide}
              onSave={handleSave}
              onCancel={() => setPanel(null)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* Slide list */}
      <div className="border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">
            Slides ({slides.length})
          </p>
          <p className="text-xs text-slate-400">Sorted by Sort Order (ascending)</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading slides…</div>
        ) : slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-slate-300">
              <rect x="4" y="4" width="16" height="16" rx="1.5" />
              <circle cx="9" cy="9.5" r="1.5" />
              <path d="m4 16 4.5-5 3.5 4 2.5-3 5.5 4" />
            </svg>
            <p className="text-sm">No slides yet. Add your first slide.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {slides.map(slide => (
              <div key={slide.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                {/* Thumbnail */}
                <img
                  src={slide.imageUrl}
                  alt={slide.label}
                  className="h-16 w-24 shrink-0 rounded border border-slate-200 object-cover"
                  onError={e => {
                    e.target.style.display = 'none'
                    e.target.nextSibling?.style && (e.target.nextSibling.style.display = 'flex')
                  }}
                />
                {/* Placeholder shown when thumbnail fails to load */}
                <div style={{ display: 'none' }} className="h-16 w-24 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                    <rect x="4" y="4" width="16" height="16" rx="1.5" /><circle cx="9" cy="9.5" r="1.5" /><path d="m4 16 4.5-5 3.5 4 2.5-3 5.5 4" />
                  </svg>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-brand-primary truncate">{slide.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${slide.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {slide.isActive ? 'Active' : 'Hidden'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      Order: {slide.sortOrder}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{slide.caption}</p>
                </div>
                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setPanel({ slide })}
                    disabled={panel !== null}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${slide.label}"? This cannot be undone.`)) handleDelete(slide.id)
                    }}
                    disabled={deleting === slide.id}
                    className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
                  >
                    {deleting === slide.id ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" /> : null}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
