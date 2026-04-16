export default function Pagination({ page, pages, total, label = 'results', onPrev, onNext }) {
  if (pages <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {pages} &bull; {total} {label}
      </p>
      <div className="flex gap-2">
        <button
          disabled={page === 1}
          onClick={onPrev}
          className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40"
        >
          Prev
        </button>
        <button
          disabled={page >= pages}
          onClick={onNext}
          className="portal-button-secondary !px-3 !py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
