import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { adminService } from '../../services/adminService'

const fmt = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const parseFilenameDate = (filename) => {
  // backup-2026-04-14T10-30-00-000Z.json.gz → readable
  const match = filename.match(/^(?:backup|pre-restore)-([\d\-T]+Z)\.json\.gz$/)
  if (!match) return filename
  try {
    return fmtDate(match[1].replace(/-(\d{2})-(\d{3})Z$/, ':$1.$2Z').replace(/T(\d{2})-(\d{2})-/, 'T$1:$2:'))
  } catch {
    return filename
  }
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------
function ConfirmRestore({ filename, onConfirm, onCancel, loading }) {
  const [phrase, setPhrase] = useState('')
  const REQUIRED = 'RESTORE'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-red-300 bg-white shadow-2xl">
        <div className="border-b border-red-200 bg-red-50 px-6 py-4">
          <p className="text-sm font-bold uppercase tracking-widest text-red-700">Confirm Database Restore</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-sm text-slate-700">
            This will <strong>permanently overwrite all current data</strong> with the contents of:
          </p>
          <p className="break-all rounded bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">{filename}</p>
          <p className="text-sm text-slate-700">
            A pre-restore snapshot will be saved automatically, but all active sessions (including yours) will be invalidated.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Type <span className="font-mono text-red-600">{REQUIRED}</span> to confirm
            </label>
            <input
              type="text"
              className="portal-input"
              value={phrase}
              onChange={e => setPhrase(e.target.value)}
              placeholder={REQUIRED}
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={phrase !== REQUIRED || loading}
            className="flex items-center gap-2 rounded bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Restore Database
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function BackupRestore() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingFile, setDeletingFile] = useState(null)
  const [downloadingFile, setDownloadingFile] = useState(null)
  const [restoreTarget, setRestoreTarget] = useState(null) // filename to restore from server list
  const [restoring, setRestoring] = useState(false)

  // Upload-based restore
  const fileRef = useRef()
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadRestoreOpen, setUploadRestoreOpen] = useState(false)

  const load = async () => {
    try {
      const { data } = await adminService.listBackups()
      setBackups(data.backups)
    } catch {
      toast.error('Failed to load backups')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Create backup
  const handleCreate = async () => {
    setCreating(true)
    try {
      const { data } = await adminService.createBackup()
      toast.success(`Backup created (${fmt(data.size)})`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  // Download backup
  const handleDownload = async (filename) => {
    setDownloadingFile(filename)
    try {
      const { data } = await adminService.downloadBackup(filename)
      const url = URL.createObjectURL(new Blob([data], { type: 'application/gzip' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloadingFile(null)
    }
  }

  // Delete backup
  const handleDelete = async (filename) => {
    if (!window.confirm(`Delete backup "${filename}"? This cannot be undone.`)) return
    setDeletingFile(filename)
    try {
      await adminService.deleteBackup(filename)
      toast.success('Backup deleted')
      setBackups(b => b.filter(x => x.filename !== filename))
    } catch {
      toast.error('Failed to delete backup')
    } finally {
      setDeletingFile(null)
    }
  }

  // Restore from server-side file (no download/re-upload needed)
  const handleRestoreFromServer = async () => {
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const { data } = await adminService.restoreBackupFromServer(restoreTarget)
      toast.success(data.message, { duration: 8000 })
      setRestoreTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  // Restore from uploaded file
  const handleRestoreFromUpload = async () => {
    if (!uploadFile) return
    setRestoring(true)
    try {
      const fd = new FormData()
      fd.append('backup', uploadFile)
      const { data } = await adminService.restoreBackup(fd)
      toast.success(data.message, { duration: 8000 })
      setUploadFile(null)
      setUploadRestoreOpen(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Confirm dialogs */}
      {restoreTarget && (
        <ConfirmRestore
          filename={restoreTarget}
          loading={restoring}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={handleRestoreFromServer}
        />
      )}
      {uploadRestoreOpen && uploadFile && (
        <ConfirmRestore
          filename={uploadFile.name}
          loading={restoring}
          onCancel={() => { setUploadRestoreOpen(false); setUploadFile(null) }}
          onConfirm={handleRestoreFromUpload}
        />
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-teal">Portal VSMS</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-primary">Backup &amp; Restore</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage database backups. Accessible to Super Admin only.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-900 disabled:opacity-60"
        >
          {creating
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <span className="text-base leading-none">+</span>}
          {creating ? 'Creating…' : 'Create Backup'}
        </button>
      </div>

      {/* Warning banner */}
      <div className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Note:</strong> Backups include all database records but <strong>not</strong> uploaded files
        (applicant documents, COR files, carousel images). Back up the <code className="text-xs font-mono bg-amber-100 px-1 rounded">server/private_uploads</code> and{' '}
        <code className="text-xs font-mono bg-amber-100 px-1 rounded">server/public_uploads</code> directories separately.
      </div>

      {/* Backup list */}
      <div className="border border-slate-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-6 py-3">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">
            Stored Backups ({backups.length})
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Loading…</div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-slate-300">
              <ellipse cx="12" cy="6.5" rx="7.5" ry="2.5" />
              <path d="M4.5 6.5v4c0 1.38 3.358 2.5 7.5 2.5s7.5-1.12 7.5-2.5v-4" />
              <path d="M4.5 10.5v4c0 1.38 3.358 2.5 7.5 2.5s7.5-1.12 7.5-2.5v-4" />
            </svg>
            <p className="text-sm">No backups yet. Click "Create Backup" to generate one.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {backups.map(b => {
              const isPreRestore = b.filename.startsWith('pre-restore-')
              return (
                <div key={b.filename} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs text-slate-700 truncate">{b.filename}</p>
                      {isPreRestore && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Pre-Restore Snapshot
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {fmtDate(b.createdAt)} &nbsp;·&nbsp; {fmt(b.size)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleDownload(b.filename)}
                      disabled={downloadingFile === b.filename}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {downloadingFile === b.filename ? 'Downloading…' : 'Download'}
                    </button>
                    <button
                      onClick={() => setRestoreTarget(b.filename)}
                      disabled={restoring || creating}
                      className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handleDelete(b.filename)}
                      disabled={deletingFile === b.filename}
                      className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
                    >
                      {deletingFile === b.filename
                        ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                        : null}
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload & restore from external file */}
      <div className="border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-slate-50 px-6 py-3">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">Restore from External File</p>
        </div>
        <div className="p-6">
          <p className="mb-4 text-sm text-slate-600">
            Upload a <code className="font-mono text-xs bg-slate-100 px-1 rounded">.json.gz</code> backup file downloaded from a previous export.
          </p>
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 border-dashed border-slate-300 bg-slate-50 py-8 text-slate-500 transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            {uploadFile ? (
              <div className="text-center">
                <p className="font-mono text-sm font-semibold text-slate-700">{uploadFile.name}</p>
                <p className="mt-1 text-xs text-slate-500">{fmt(uploadFile.size)}</p>
              </div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-slate-400">
                  <path d="M12 15V5" /><path d="m8.5 8.5 3.5-3.5 3.5 3.5" /><path d="M5 18.5h14" />
                </svg>
                <span className="text-sm">Click to select a backup file</span>
                <span className="text-xs text-slate-400">.json.gz — max 50 MB</span>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".gz,.json.gz"
            className="hidden"
            onChange={e => {
              const f = e.target.files[0]
              if (f) setUploadFile(f)
              e.target.value = ''
            }}
          />
          {uploadFile && (
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setUploadFile(null)}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                onClick={() => setUploadRestoreOpen(true)}
                disabled={restoring}
                className="rounded bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Restore from This File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
