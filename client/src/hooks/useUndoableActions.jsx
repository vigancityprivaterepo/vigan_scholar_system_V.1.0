import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

const UNDO_MS = 5000

// Decision actions are held for 5 seconds before they are sent, so "Undo" never has to reverse a saved change.
// Leaving the page sends anything still waiting straight away; closing the tab asks first.
export function useUndoableActions() {
  const pending = useRef(new Map())
  const [hiddenIds, setHiddenIds] = useState(() => new Set())

  const setHidden = (id, hidden) => setHiddenIds((current) => {
    const next = new Set(current)
    if (hidden) next.add(id)
    else next.delete(id)
    return next
  })

  const run = useCallback(async (id) => {
    const entry = pending.current.get(id)
    if (!entry) return
    pending.current.delete(id)
    clearTimeout(entry.timer)
    toast.dismiss(entry.toastId)
    try {
      await entry.commit()
      entry.onDone?.()
    } catch (err) {
      setHidden(id, false)
      toast.error(err?.response?.data?.message || entry.errorMessage || 'That action did not go through. Please try again.')
    }
  }, [])

  const undo = useCallback((id) => {
    const entry = pending.current.get(id)
    if (!entry) return
    pending.current.delete(id)
    clearTimeout(entry.timer)
    toast.dismiss(entry.toastId)
    setHidden(id, false)
  }, [])

  // message: what the toast says; commit: the API call; onDone: refresh after it is saved.
  const schedule = useCallback(({ id, message, commit, onDone, errorMessage }) => {
    if (pending.current.has(id)) return
    setHidden(id, true)
    const toastId = toast.custom(
      (t) => (
        <div className={`toast ${t.visible ? 'animate-slide-up' : 'opacity-0'}`} role="status">
          <span className="min-w-0 flex-1">{message}</span>
          <button type="button" onClick={() => undo(id)} className="press rounded-control px-2 py-1 font-semibold text-emerald-300 hover:text-white">
            Undo
          </button>
        </div>
      ),
      { duration: UNDO_MS + 500 },
    )
    const timer = setTimeout(() => run(id), UNDO_MS)
    pending.current.set(id, { commit, onDone, errorMessage, timer, toastId })
  }, [run, undo])

  useEffect(() => {
    const warn = (event) => {
      if (pending.current.size === 0) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    const entries = pending.current
    return () => {
      window.removeEventListener('beforeunload', warn)
      // Navigating inside the app: send what is waiting now rather than drop it.
      for (const id of [...entries.keys()]) run(id)
    }
  }, [run])

  return { schedule, hiddenIds, isHidden: (id) => hiddenIds.has(id) }
}
