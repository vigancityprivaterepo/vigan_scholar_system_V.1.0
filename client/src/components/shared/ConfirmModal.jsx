import { useEffect, useRef } from 'react'

/**
 * ConfirmModal — branded confirmation dialog.
 *
 * Props:
 *   title        string   — dialog heading
 *   message      string   — body text
 *   confirmLabel string   — label for the confirm button (default "Confirm")
 *   danger       bool     — render confirm button in red (default false)
 *   loading      bool     — show spinner / disable buttons while async op runs
 *   onConfirm    fn       — called when user clicks the confirm button
 *   onCancel     fn       — called when user cancels / presses Escape
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !loading) onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [loading, onCancel])

  // Focus the cancel button on open for keyboard safety
  useEffect(() => { cancelRef.current?.focus() }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel() }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className={`border-b px-6 py-4 ${danger ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
          <p id="confirm-modal-title" className={`text-sm font-bold uppercase tracking-widest ${danger ? 'text-red-700' : 'text-brand-primary'}`}>
            {title}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-700">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex items-center gap-2 rounded px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-indigo-900'
            }`}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
