import logo from '../../assets/logo.png'

// Shared by the sign-in, register, verify-email and forgot-password pages.
export function AuthBrandPanel() {
  return (
    <div className="hidden w-[42%] flex-col justify-between bg-[#064e3b] px-10 py-12 text-white lg:flex">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img src={logo} alt="Vigan City Seal" className="h-28 w-28 object-contain" />
        <p className="mt-7 font-display text-3xl font-bold leading-tight">City Government of Vigan</p>
        <p className="mt-2 text-sm text-emerald-100">Province of Ilocos Sur · Scholarship Program</p>
        <p className="mt-6 max-w-xs text-sm leading-relaxed text-emerald-50/90">
          Apply for the city scholarship, upload your requirements, and follow your application from submission to acceptance.
        </p>
      </div>

      <div className="border-t border-white/20 pt-5 text-sm">
        <p className="font-semibold">Scholarship Office</p>
        <p className="mt-1 text-emerald-100">City Hall, Vigan City, Ilocos Sur</p>
      </div>
    </div>
  )
}

export function AuthMobileBar() {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-[#064e3b] px-5 py-3 lg:hidden">
      <img src={logo} alt="Vigan City Seal" className="h-9 w-9 object-contain" />
      <div>
        <p className="text-sm font-bold text-white">City Government of Vigan</p>
        <p className="text-xs text-emerald-100">Scholarship Program</p>
      </div>
    </div>
  )
}
