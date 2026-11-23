import { useState } from 'react'
import { InfoIcon } from '../../components/ui/PortalIcons'
import { FAQ_ITEMS } from '../../utils/faq'


export default function HelpPage() {
  const [active, setActive] = useState(0)

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="portal-page-title">FAQ and Help</h1>
        <p className="portal-page-subtitle">Answers to common questions to help you finish requirements faster.</p>
      </div>

      <div className="card p-6">
        <div className="mb-5 flex items-start gap-3 rounded-control border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-control border border-blue-200 bg-white text-blue-700">
            <InfoIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">Before sending an inquiry</p>
            <p className="mt-1 leading-6">Check this page first. Most applicant questions are answered here and in your Status page remarks.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, index) => (
            <div key={item.q} className="overflow-hidden rounded-control border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setActive(active === index ? -1 : index)}
                aria-expanded={active === index}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
              >
                <span className="text-sm font-semibold text-brand-primary">{item.q}</span>
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${active === index ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {active === index ? '-' : '+'}
                </span>
              </button>
              {active === index && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 text-base text-slate-700">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-control border border-brand-divider bg-brand-bg p-4 text-sm text-slate-600">
          <p className="font-semibold text-brand-primary">Need more help?</p>
          <p className="mt-1 leading-6">
            Visit the Scholarship Office at City Hall, Vigan City. Bring your reference ID (shown on your Dashboard) so staff can find your application quickly.
          </p>
        </div>
      </div>
    </div>
  )
}
