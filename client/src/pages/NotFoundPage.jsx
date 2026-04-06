import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <img src={logo} alt="Vigan City Seal" className="mb-6 h-20 w-20 object-contain opacity-60" />
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#059669]">Error 404</p>
      <h1 className="mt-3 font-display text-4xl font-bold text-[#0c2340] md:text-5xl">Page Not Found</h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#0c2340] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#064e3b]"
      >
        Back to Home
      </Link>
    </div>
  )
}
