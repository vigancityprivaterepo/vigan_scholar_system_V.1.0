import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// Wording follows the published eligibility rules on the public site. Nothing here is saved or sent.
const QUESTIONS = [
  {
    q: 'Have you lived in Vigan City for at least one year?',
    hint: 'Your Punong Barangay certifies this on the Certificate of Residency.',
    fail: 'You need to be a bonafide resident of a Vigan City barangay for at least one year.',
  },
  {
    q: 'Did you graduate from a recognized public high school?',
    hint: 'Senior high school graduates of public schools may apply.',
    fail: 'The scholarship is for graduates of a duly recognized public high school.',
  },
  {
    q: 'Are you enrolled, or planning to enroll, in a 4-year college course?',
    hint: 'Two-year and short courses are not covered.',
    fail: 'You need to be enrolled or planning to enroll in a 4-year college course.',
  },
  {
    q: 'Is your general average at least 83%?',
    hint: 'Look at your Form 138 (report card).',
    fail: 'Your general average needs to be at least 83%.',
  },
  {
    q: 'Is every grade 80% or higher for the 1st and 2nd semester?',
    hint: 'One grade below 80% is enough to be turned down.',
    fail: 'No grade can be lower than 80% in the 1st and 2nd semester.',
  },
]

const ADVANCE_MS = 280

export default function EligibilityChecker() {
  const [answers, setAnswers] = useState([])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const timer = useRef(0)
  const headingRef = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { headingRef.current?.focus() }, [index])

  const done = index >= QUESTIONS.length
  const failures = QUESTIONS.filter((_, i) => answers[i] === false)

  const answer = (value) => {
    if (picked !== null) return
    setPicked(value)
    timer.current = setTimeout(() => {
      setAnswers((current) => {
        const next = [...current]
        next[index] = value
        return next
      })
      setIndex((i) => i + 1)
      setPicked(null)
    }, ADVANCE_MS)
  }

  const back = () => {
    clearTimeout(timer.current)
    setPicked(null)
    setIndex((i) => Math.max(0, i - 1))
  }

  const restart = () => {
    setAnswers([])
    setIndex(0)
    setPicked(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="portal-page-title">Check your eligibility</h1>
        <p className="portal-page-subtitle">Five yes-or-no questions. It takes about a minute and nothing is saved.</p>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {QUESTIONS.map((_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <span className={`block h-full origin-left bg-brand-teal transition-transform duration-slow ease-spring ${i < index ? 'scale-x-100' : 'scale-x-0'}`} />
          </span>
        ))}
      </div>

      {!done ? (
        <section key={index} className="flex animate-from-right flex-col gap-4 rounded-[20px] bg-white p-5 shadow-card" aria-live="polite">
          <p className="text-sm font-semibold text-emerald-700">Question {index + 1} of {QUESTIONS.length}</p>
          <h2 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold leading-tight text-brand-primary outline-none">
            {QUESTIONS[index].q}
          </h2>
          <p className="text-[15px] text-slate-600">{QUESTIONS[index].hint}</p>
          <div className="mt-1 grid grid-cols-2 gap-3">
            {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map((option) => {
              const chosen = picked === option.value || (picked === null && answers[index] === option.value)
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => answer(option.value)}
                  aria-pressed={chosen}
                  className={`press min-h-16 rounded-[14px] border-2 text-lg font-semibold transition-colors duration-fast ${
                    chosen ? 'border-brand-teal bg-brand-teal text-white' : 'border-slate-300 bg-white text-brand-primary hover:border-brand-teal'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          {index > 0 && (
            <button type="button" onClick={back} className="self-start py-2 text-[15px] font-semibold text-brand-teal">← Previous question</button>
          )}
        </section>
      ) : failures.length === 0 ? (
        <section className="flex animate-pop-in flex-col gap-4 rounded-[20px] bg-white p-5 shadow-card" aria-live="polite">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          </span>
          <h2 className="font-display text-2xl font-semibold text-brand-primary">You look eligible</h2>
          <p className="text-[15px] text-slate-600">Based on your answers you meet every published requirement. The office still checks your documents.</p>
          <ul className="flex flex-col gap-2">
            {QUESTIONS.map((item, i) => (
              <li key={item.q} className="flex animate-slide-up items-start gap-2.5 text-[15px] text-slate-700" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700" aria-hidden="true">✓</span>
                {item.q.replace(/\?$/, '')}
              </li>
            ))}
          </ul>
          <Link to="/applicant/apply" className="btn-cta mt-2">Start my application</Link>
          <button type="button" onClick={restart} className="self-center py-2 text-[15px] font-semibold text-brand-teal">Answer again</button>
        </section>
      ) : (
        <section className="flex animate-pop-in flex-col gap-4 rounded-[20px] bg-white p-5 shadow-card" aria-live="polite">
          <h2 className="font-display text-2xl font-semibold text-brand-primary">
            {failures.length === 1 ? 'One requirement is not met' : `${failures.length} requirements are not met`}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {failures.map((item, i) => (
              <li key={item.q} className="flex animate-slide-up items-start gap-2.5 rounded-button border border-amber-200 bg-amber-50 p-3 text-[15px] text-amber-900" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="mt-0.5 font-bold" aria-hidden="true">!</span>
                {item.fail}
              </li>
            ))}
          </ul>
          <p className="text-[15px] text-slate-600">If you think one of these is wrong, ask the Scholarship Office at City Hall before applying.</p>
          <button type="button" onClick={restart} className="btn min-h-12 text-base">Answer again</button>
        </section>
      )}
    </div>
  )
}
