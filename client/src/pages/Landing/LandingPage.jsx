import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'

function useCounter(end, duration = 2000, start = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return

    let startTime = null

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(progress * end)
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [end, duration, start])

  return count
}

function IconBase({ children, className = 'h-6 w-6' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function FileTextIcon() {
  return (
    <IconBase>
      <path d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9 11h6" />
      <path d="M9 15h6" />
    </IconBase>
  )
}

function ProcessIconBase({ children, className = 'h-9 w-9' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="#20232A"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function ApplicantChecklistIcon() {
  return (
    <ProcessIconBase>
      <rect x="5" y="9" width="10" height="10" rx="2" />
      <path d="m8 14 2 2 4-5" stroke="#d65945" />
      <rect x="5" y="22" width="10" height="10" rx="2" />
      <path d="m8 27 2 2 4-5" stroke="#d65945" />
      <circle cx="31" cy="14" r="5.5" />
      <path d="M22 35c1.8-5 5-8 9-8s7.2 3 9 8" />
      <path d="M31 20v7" />
      <ellipse cx="31" cy="41" rx="10" ry="2.5" stroke="#d65945" />
    </ProcessIconBase>
  )
}

function ScrollCheckIcon() {
  return (
    <ProcessIconBase>
      <path d="M12 8h18a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H18" />
      <path d="M12 8a5 5 0 0 0 0 10h5" />
      <path d="M18 18h10" />
      <circle cx="29.5" cy="25.5" r="7.5" stroke="#d65945" />
      <path d="m26 25.5 2.2 2.2 5-5.2" stroke="#d65945" />
    </ProcessIconBase>
  )
}

function DocumentStackIcon() {
  return (
    <ProcessIconBase>
      <path d="m12 14 12-5 12 5-12 5-12-5Z" />
      <path d="m12 21 12-5 12 5" />
      <path d="m12 28 12-5 12 5" />
      <rect x="29" y="24" width="10" height="12" rx="2" stroke="#d65945" />
      <path d="M32 29h4" stroke="#d65945" />
      <path d="M32 33h4" stroke="#d65945" />
    </ProcessIconBase>
  )
}

function ClipboardPencilIcon() {
  return (
    <ProcessIconBase>
      <rect x="12" y="9" width="24" height="30" rx="3" />
      <path d="M19 9.5h10" />
      <path d="M18 18h12" />
      <path d="M18 24h12" />
      <path d="M18 30h8" />
      <path d="m31 32 7-7 3 3-7 7-4 1Z" stroke="#d65945" />
    </ProcessIconBase>
  )
}

function CertificateSealIcon() {
  return (
    <ProcessIconBase>
      <path d="M14 8h16l6 6v24H14Z" />
      <path d="M30 8v7h6" />
      <path d="M19 22h12" />
      <path d="M19 28h10" />
      <circle cx="30.5" cy="33.5" r="4.5" stroke="#d65945" />
      <path d="m28.5 33.5 1.3 1.4 2.7-2.9" stroke="#d65945" />
      <path d="m28.8 37.3-1.1 4 2.8-1.7 2.8 1.7-1.1-4" stroke="#d65945" />
    </ProcessIconBase>
  )
}

function InterviewPanelIcon() {
  return (
    <ProcessIconBase>
      <circle cx="24" cy="14" r="5.5" />
      <path d="M15 35c1.6-5.8 5.1-9 9-9s7.4 3.2 9 9" />
      <path d="M12 22h7" />
      <path d="M29 22h7" />
      <path d="M18 35h12" stroke="#d65945" />
      <path d="M20 40h8" stroke="#d65945" />
    </ProcessIconBase>
  )
}

function ClipboardCheckIcon() {
  return (
    <IconBase>
      <path d="M9 4.5h6" />
      <path d="M9.5 3h5A1.5 1.5 0 0 1 16 4.5V6H8V4.5A1.5 1.5 0 0 1 9.5 3Z" />
      <path d="M8 5.5H6.5A1.5 1.5 0 0 0 5 7v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V7a1.5 1.5 0 0 0-1.5-1.5H16" />
      <path d="m9 13 2 2 4-4" />
    </IconBase>
  )
}

function ShieldCheckIcon() {
  return (
    <IconBase>
      <path d="M12 3.5c2 1.6 4.4 2.3 6.5 2.6v5.4c0 4.3-2.6 7.5-6.5 9-3.9-1.5-6.5-4.7-6.5-9V6.1c2.1-.3 4.5-1 6.5-2.6Z" />
      <path d="m9.5 12.5 1.8 1.8 3.7-3.8" />
    </IconBase>
  )
}

function UsersIcon() {
  return (
    <IconBase>
      <path d="M16.5 19.5v-1.2a3.3 3.3 0 0 0-3.3-3.3h-2.4a3.3 3.3 0 0 0-3.3 3.3v1.2" />
      <circle cx="12" cy="9" r="3" />
      <path d="M18.5 8.5a2.5 2.5 0 0 1 0 5" />
      <path d="M5.5 13.5a2.5 2.5 0 0 1 0-5" />
    </IconBase>
  )
}

function MedalIcon() {
  return (
    <IconBase>
      <path d="m9 3.5 3 5 3-5" />
      <path d="m8.5 8.5-2 3.5 5.5 8 5.5-8-2-3.5" />
      <circle cx="12" cy="13.5" r="2.75" />
    </IconBase>
  )
}

function BanknoteIcon() {
  return (
    <IconBase>
      <rect x="3.5" y="6.5" width="17" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9.5h.01" />
      <path d="M17 14.5h.01" />
    </IconBase>
  )
}

function GraduationCapIcon() {
  return (
    <IconBase>
      <path d="m3.5 9 8.5-4 8.5 4-8.5 4-8.5-4Z" />
      <path d="M7.5 11.1V15c0 .7 2 2 4.5 2s4.5-1.3 4.5-2v-3.9" />
      <path d="M20.5 10v4.5" />
    </IconBase>
  )
}

function ArrowRightIcon({ className = 'h-4 w-4' }) {
  return (
    <IconBase className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  )
}

function ArrowLeftIcon({ className = 'h-4 w-4' }) {
  return (
    <IconBase className={className}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </IconBase>
  )
}

function FacebookIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.6-1.6H16.5V4.8c-.3 0-.9-.1-1.8-.1-2.6 0-4.2 1.6-4.2 4.5V11H8v3h2.5v7h3Z" />
    </svg>
  )
}

function SealPlaceholder({ small = false }) {
  return (
    <img
      src={logo}
      alt="Vigan City Seal"
      className={small ? 'h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 shrink-0 object-contain' : 'h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 shrink-0 object-contain'}
    />
  )
}

const SERVER_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'

const FALLBACK_SLIDES = [
  {
    imageUrl: '/vigan.jpg',
    label: 'Vigan City Scholarship Program',
    caption: 'A formal and transparent digital application system for qualified students seeking scholarship support from the City Government of Vigan.',
  },
]

const SCHOLARS_PER_PAGE = 20

function ScholarCarousel() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES)
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    fetch(`${SERVER_BASE}/api/carousel`)
      .then(r => r.json())
      .then(data => { if (data.slides?.length) setSlides(data.slides) })
      .catch(() => {/* keep fallback */})
  }, [])

  useEffect(() => {
    if (paused || slides.length < 2) return
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [paused, slides.length])

  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length)
  const next = () => setCurrent(c => (c + 1) % slides.length)

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[300px] sm:min-h-[320px] md:min-h-[380px]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.24) 42%, rgba(0,0,0,0.12) 100%), url('${slide.imageUrl.startsWith('/uploads') ? SERVER_BASE + slide.imageUrl : slide.imageUrl}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between px-4 py-5 text-white sm:px-6 sm:py-8 md:px-8 md:py-12">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-200 sm:text-sm sm:tracking-[0.2em]">Academic Year 2026</p>
                <h2 className="mt-1.5 font-display text-lg font-bold leading-tight sm:mt-3 sm:text-3xl md:text-4xl lg:text-5xl">{slide.label}</h2>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-slate-100 sm:mt-4 sm:text-sm sm:leading-7 md:text-base lg:text-lg">{slide.caption}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white bg-white px-4 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-slate-100 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"
                >
                  Apply Now <ArrowRightIcon />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-md border border-white/50 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:px-5 sm:py-3 sm:text-sm"
                >
                  View Application Process
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white transition-colors hover:bg-black/55"
            aria-label="Previous slide"
          >‹</button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-xl text-white transition-colors hover:bg-black/55"
            aria-label="Next slide"
          >›</button>
        </>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

const processSteps = [
  {
    n: '01',
    title: 'Application',
    desc: 'Create an account and complete the scholarship application form with your personal and academic information.',
    Icon: ApplicantChecklistIcon,
  },
  {
    n: '02',
    title: 'Document Review',
    desc: 'Submit the required records and certifications for verification by the scholarship office.',
    Icon: ScrollCheckIcon,
  },
  {
    n: '03',
    title: 'Eligibility Screening',
    desc: 'Applications are reviewed against the published academic and residency requirements.',
    Icon: DocumentStackIcon,
  },
  {
    n: '04',
    title: 'Assessment',
    desc: 'Qualified applicants proceed to examination and interview schedules when required.',
    Icon: ClipboardPencilIcon,
  },
  {
    n: '05',
    title: 'Approval',
    desc: 'Approved applicants receive the formal notice of award and next-step instructions.',
    Icon: CertificateSealIcon,
  },
  {
    n: '06',
    title: 'Confirmation',
    desc: 'Accepted scholars confirm enrollment and complete final scholarship requirements.',
    Icon: InterviewPanelIcon,
  },
]

const benefits = [
  {
    title: 'Full Tuition Coverage',
    desc: 'Qualified scholars receive tuition support so they can focus on academic performance and completion.',
    Icon: GraduationCapIcon,
  },
  {
    title: 'Monthly Stipend',
    desc: 'The program provides financial assistance for transportation, materials, and daily study needs.',
    Icon: BanknoteIcon,
  },
  {
    title: 'Mentorship and Support',
    desc: 'Scholars receive guidance and program support throughout their academic stay in partner institutions.',
    Icon: UsersIcon,
  },
]

const faqs = [
  { q: 'Who is eligible to apply?', a: 'Any Filipino student currently enrolled or planning to enroll in a 4-year college course with a GWA of 2.0 or higher, or 85% and above, may apply.' },
  {
    q: 'What documents are required?',
    items: [
      'Personal Letter of Application addressed to City Mayor.',
      'Certificated of Residency from the Punong Barangay (certifying that the applicant is a bonafide resident of the barangay for at least one (1) year and has no derogatory records).',
      'Form 138 (General Average of at least 83% and no grade lower than 80% for the 1st and 2nd Semester).',
      'Certification from High School Principal that the applicant is eligible for college education and of Good Moral Character.',
      'Result of College Admission Test(CAT)',
      'Picture (Passport Size with Printed Name).',
      'Affidavit executed by one of the applicants parents or legal guardian that their combined annual income is less than eighty Four Thousand Two Hundred Four Pesos (P 84, 204.00) and they do not have any real estate property with fair value of not more than Two Hundred Fifty thousand Peses (P 250, 000.00)',
    ],
  },
  { q: 'When is the application deadline?', a: 'Applications are accepted during the announced scholarship period for each semester. Please refer to the latest announcements for the current cycle.' },
  { q: 'How long does the process take?', a: 'The full review process typically takes four to eight weeks depending on application volume and schedule of assessments.' },
  { q: 'Is there a monetary benefit?', a: 'Yes. The scholarship includes tuition support and a monthly stipend, subject to the rules and conditions of the program.' },
  { q: 'Can I reapply if I was not accepted?', a: 'Yes. Applicants who were not selected may apply again in the next application period if they still meet the program requirements.' },
]

function formatBoardExamName(fullName = '') {
  const normalized = fullName
    .trim()
    .replace(/\s+/g, ' ')

  if (!normalized) return 'NAME NOT AVAILABLE'

  const parts = normalized.split(' ')
  if (parts.length === 1) return parts[0].toUpperCase()

  const suffixes = new Set(['JR', 'JR.', 'SR', 'SR.', 'II', 'III', 'IV', 'V'])
  const lastPart = parts[parts.length - 1].toUpperCase()
  const hasSuffix = suffixes.has(lastPart)

  const suffix = hasSuffix ? parts.pop().toUpperCase() : ''
  const lastName = (parts.pop() || '').toUpperCase()
  const firstName = (parts.shift() || '').toUpperCase()
  const middleNames = parts.map((part) => `${part.charAt(0).toUpperCase()}.`).join(' ')

  return [lastName, suffix].filter(Boolean).join(' ') + ', ' + [firstName, middleNames].filter(Boolean).join(' ')
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false)
  const [activeFaq, setActiveFaq] = useState(null)
  const [siteSettings, setSiteSettings] = useState({
    facebookPageName: '',
    facebookPageUrl: '',
    facebookPageDescription: '',
  })
  const [postedScholars, setPostedScholars] = useState([])
  const [scholarPage, setScholarPage] = useState(0)
  const statsRef = useRef(null)

  const awarded = useCounter(2.4, 2000, statsVisible)
  const scholars = useCounter(340, 2000, statsVisible)
  const schools = useCounter(12, 2000, statsVisible)
  const successRate = useCounter(94, 2000, statsVisible)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStatsVisible(true)
      },
      { threshold: 0.35 }
    )

    if (statsRef.current) observer.observe(statsRef.current)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetch(`${SERVER_BASE}/api/settings`)
      .then(r => r.json())
      .then((data) => {
        if (data.settings) setSiteSettings(data.settings)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${SERVER_BASE}/api/scholars`)
      .then(r => r.json())
      .then((data) => {
        if (data.posts) {
          setPostedScholars(data.posts)
          setScholarPage(0)
        }
      })
      .catch(() => {})
  }, [])

  const totalScholarPages = Math.max(1, Math.ceil(postedScholars.length / SCHOLARS_PER_PAGE))
  const currentScholarPage = Math.min(scholarPage, totalScholarPages - 1)
  const visibleScholars = postedScholars.slice(
    currentScholarPage * SCHOLARS_PER_PAGE,
    currentScholarPage * SCHOLARS_PER_PAGE + SCHOLARS_PER_PAGE
  )
  const scholarRangeStart = postedScholars.length ? currentScholarPage * SCHOLARS_PER_PAGE + 1 : 0
  const scholarRangeEnd = Math.min((currentScholarPage + 1) * SCHOLARS_PER_PAGE, postedScholars.length)

  const downloadScholarNotice = () => {
    if (!postedScholars.length) return

    const rows = postedScholars.map((scholar, index) => `
      <tr>
        <td>${String(index + 1).padStart(2, '0')}</td>
        <td>${escapeHtml(formatBoardExamName(scholar.applicant_name))}</td>
        <td>${escapeHtml(scholar.school || 'Not specified')}</td>
        <td>${escapeHtml(scholar.course || 'Not specified')}</td>
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank', 'width=1024,height=768')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Accepted Scholars Public Notice</title>
          <style>
            body {
              margin: 0;
              font-family: "Times New Roman", serif;
              color: #1e3a5f;
              background: #f3f4f6;
            }
            .page {
              position: relative;
              width: 900px;
              margin: 24px auto;
              padding: 48px 56px;
              background: white;
              border: 1px solid #cbd5e1;
              box-sizing: border-box;
              overflow: hidden;
            }
            .watermark {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              transform: rotate(-28deg);
              font-size: 76px;
              font-weight: 700;
              letter-spacing: 0.2em;
              color: rgba(185, 28, 28, 0.09);
              pointer-events: none;
              user-select: none;
              white-space: nowrap;
            }
            .header {
              display: flex;
              align-items: flex-start;
              gap: 18px;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 20px;
            }
            .seal {
              width: 64px;
              height: 64px;
              object-fit: contain;
            }
            .header-copy {
              flex: 1;
              text-align: center;
            }
            .eyebrow, .subline, .meta {
              text-transform: uppercase;
              letter-spacing: 0.18em;
            }
            .eyebrow {
              font-size: 12px;
              color: #64748b;
            }
            h1 {
              margin: 14px 0 0;
              font-size: 42px;
              line-height: 1.1;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .subline {
              margin-top: 14px;
              font-size: 14px;
              color: #64748b;
            }
            table {
              width: 100%;
              margin-top: 28px;
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              color: #334155;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 14px 16px;
              text-align: left;
              vertical-align: top;
              font-size: 14px;
            }
            th {
              background: #f8fafc;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.18em;
              color: #475569;
            }
            td:first-child, th:first-child {
              width: 72px;
              text-align: center;
            }
            td:nth-child(2) {
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #1e3a5f;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              margin-top: 28px;
              padding-top: 16px;
              border-top: 1px solid #cbd5e1;
              font-family: Arial, sans-serif;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.16em;
              color: #64748b;
            }
            .notice {
              margin-top: 18px;
              font-family: Arial, sans-serif;
              font-size: 11px;
              line-height: 1.7;
              color: #7f1d1d;
              text-transform: uppercase;
              letter-spacing: 0.14em;
            }
            @media print {
              body {
                background: white;
              }
              .page {
                width: auto;
                margin: 0;
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="watermark">CONFIDENTIAL DOCUMENT</div>
            <div class="header">
              <img class="seal" src="${window.location.origin}${logo}" alt="Vigan City Seal" />
              <div class="header-copy">
                <div class="eyebrow">City Government of Vigan</div>
                <h1>Official Results Posting</h1>
                <div class="subline">Accepted Scholarship Applicants for Public Viewing</div>
              </div>
              <div style="width:64px;height:64px;"></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Name of Scholar</th>
                  <th>School</th>
                  <th>Course</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="footer">
              <div>Document released for public viewing</div>
              <div>${postedScholars.length} accepted scholar${postedScholars.length === 1 ? '' : 's'} listed</div>
            </div>

            <div class="notice">
              Confidential document. This public notice is generated from the scholarship portal and should not be altered, republished, or misrepresented without authorization from the scholarship office.
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-300 bg-white">
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs text-slate-600 md:px-8">
            <p className="tracking-[0.2em] uppercase text-slate-500">Republic of the Philippines</p>
            <div className="flex items-center gap-3 md:gap-6">
              <a href="#faq" className="hidden hover:text-brand-primary md:block">Scholarship Guidelines</a>
              <Link to="/login" className="hover:text-brand-primary">Applicant Login</Link>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#0f3d6d] via-[#164f8c] to-[#0f3d6d] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:gap-6 md:px-8 md:py-5">
            <div className="flex items-center gap-3 md:gap-4">
              <SealPlaceholder />
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-slate-200 sm:text-xs sm:tracking-[0.28em] md:text-sm">
                  Heritage City Scholarship Portal
                </p>
                <h1 className="font-display text-base font-bold leading-none sm:text-2xl md:text-4xl lg:text-5xl">
                  City Government of Vigan
                </h1>
                <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-slate-200 sm:text-xs md:mt-2 md:text-sm md:tracking-[0.22em] lg:text-base">
                  Province of Ilocos Sur
                </p>
              </div>
            </div>

            <div className="hidden border-white/20 text-right text-sm text-slate-100 lg:block lg:border-l lg:pl-8">
              <p className="font-semibold uppercase tracking-[0.2em] text-slate-200">Scholarship Services</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-100">
                Online scholarship application, verification, and status tracking for qualified students of Vigan City.
              </p>
            </div>
          </div>
        </div>

        <nav className="border-t border-slate-300 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-8 md:py-3">
            <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-slate-700 md:flex">
              <a href="#overview" className="hover:text-brand-primary">Overview</a>
              <a href="#how-it-works" className="hover:text-brand-primary">Application Process</a>
              <a href="#benefits" className="hover:text-brand-primary">Benefits</a>
              <a href="#faq" className="hover:text-brand-primary">Frequently Asked Questions</a>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary sm:px-4 sm:py-2 sm:text-sm"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-md border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-900 sm:px-4 sm:py-2 sm:text-sm"
              >
                Apply for Scholarship
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section id="overview" className="border-b border-slate-200 bg-slate-100">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-8 lg:grid-cols-[1.35fr_0.95fr] lg:py-16">
            <div className="overflow-hidden border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-300 bg-slate-50 px-6 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Official Scholarship Portal
                </p>
              </div>
              <ScholarCarousel />
            </div>

            <aside className="border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-300 px-6 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Program Highlights
                </p>
              </div>
              <div ref={statsRef} className="grid grid-cols-2 border-b border-slate-200">
                {[
                  { value: `PHP ${awarded.toFixed(1)}M+`, label: 'Total Awarded' },
                  { value: `${Math.round(scholars)}+`, label: 'Active Scholars' },
                  { value: `${Math.round(schools)}`, label: 'Partner Schools' },
                  { value: `${Math.round(successRate)}%`, label: 'Success Rate' },
                ].map(({ value, label }) => (
                  <div key={label} className="border-b border-r border-slate-200 px-5 py-5 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
                    <p className="font-display text-2xl font-bold text-brand-primary">{value}</p>
                    <p className="mt-1 text-sm text-slate-600">{label}</p>
                  </div>
                ))}
              </div>
              <div className="px-6 py-5">
                <p className="text-sm leading-7 text-slate-600">
                  Applicants may create an account, submit requirements, monitor progress, and receive updates through the portal.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section id="how-it-works" className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Application Process</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-brand-primary md:text-4xl xl:text-5xl">
                Six clear steps from application to confirmation
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                The scholarship process is presented in a straightforward sequence so applicants understand each requirement and review stage.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {processSteps.map(({ n, title, desc, Icon }) => (
                <article key={n} className="border border-slate-300 bg-slate-50 p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-md border border-slate-300 bg-white">
                      <Icon />
                    </div>
                    <span className="font-mono text-xs font-semibold tracking-[0.2em] text-slate-500">{n}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-brand-primary">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="benefits" className="border-y border-slate-200 bg-slate-100 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Scholarship Benefits</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-brand-primary md:text-4xl xl:text-5xl">
                Support designed for academic continuity
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                The program combines financial support and structured guidance to help scholars remain enrolled and complete their studies.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {benefits.map(({ title, desc, Icon }) => (
                <article key={title} className="border border-slate-300 bg-white p-7 shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-brand-primary">
                    <Icon />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-bold text-brand-primary">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-4 md:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Frequently Asked Questions</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-brand-primary md:text-4xl xl:text-5xl">
                Guidance for applicants and parents
              </h2>
            </div>

            <div className="mt-10 flex flex-col gap-4">
              {faqs.map((faq, index) => (
                <div key={faq.q} className="border border-slate-300 bg-slate-50 shadow-sm">
                  <button
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-base font-semibold text-brand-primary"
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  >
                    <span>{faq.q}</span>
                    <span className="shrink-0 text-xl leading-none text-slate-500">
                      {activeFaq === index ? '−' : '+'}
                    </span>
                  </button>
                  {activeFaq === index && (
                    <div className="border-t border-slate-300 bg-white px-6 py-5 text-sm leading-7 text-slate-600">
                      {faq.items ? (
                        <ul className="list-disc space-y-3 pl-5">
                          {faq.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        faq.a
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-300 bg-slate-200 py-16">
          <div className="mx-auto max-w-5xl px-4 text-center md:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Online Services</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-brand-primary md:text-4xl xl:text-5xl">
              Begin your scholarship application
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Create your account to submit requirements, monitor application progress, and receive scholarship notices online.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-md border border-brand-primary bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-900"
              >
                Create Applicant Account
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md border border-slate-400 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        </section>

        {postedScholars.length > 0 && (
          <section className="border-t border-slate-300 bg-slate-100 py-16 md:py-20">
            <div className="mx-auto max-w-7xl px-4 md:px-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Public Posting</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-brand-primary md:text-4xl xl:text-5xl">
                  Accepted scholars public notice
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  Presented in a bulletin-style public viewing format so the release feels like an official posted result, not a generic card list.
                </p>
              </div>

              <div className="mt-10 overflow-hidden border border-slate-300 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-900 px-5 py-3 text-white">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Public PDF View</p>
                    <p className="mt-1 text-sm font-medium text-white">Official list of accepted scholars</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={downloadScholarNotice}
                      className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20"
                    >
                      Download Notice
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-400" />
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>

                {postedScholars.length > SCHOLARS_PER_PAGE && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3 text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                      Showing {scholarRangeStart}-{scholarRangeEnd} of {postedScholars.length} scholars
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScholarPage((page) => Math.max(0, page - 1))}
                        disabled={currentScholarPage === 0}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Previous scholar page"
                      >
                        <ArrowLeftIcon />
                      </button>
                      <span className="min-w-[92px] text-center text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Page {currentScholarPage + 1} of {totalScholarPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setScholarPage((page) => Math.min(totalScholarPages - 1, page + 1))}
                        disabled={currentScholarPage === totalScholarPages - 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Next scholar page"
                      >
                        <ArrowRightIcon />
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_18%,#ffffff_100%)] px-3 py-3 sm:px-6 md:px-10 md:py-8">
                  <div className="mx-auto max-w-5xl border border-slate-300 bg-white p-4 shadow-sm sm:p-6 md:p-10">
                    <div className="border-b border-slate-300 pb-5">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="shrink-0">
                          <SealPlaceholder small />
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">City Government of Vigan</p>
                          <h3 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.08em] text-brand-primary sm:text-3xl md:text-4xl">
                            Official Results Posting
                          </h3>
                          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500 sm:text-sm sm:tracking-[0.18em]">
                            Accepted Scholarship Applicants for Public Viewing
                          </p>
                        </div>
                        <div className="hidden h-10 w-10 shrink-0 md:block" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="mt-6 hidden overflow-hidden border border-slate-300 md:block">
                      <div className="grid grid-cols-[68px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-slate-300 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                        <div className="border-r border-slate-300 px-3 py-3 text-center">No.</div>
                        <div className="border-r border-slate-300 px-4 py-3">Name of Scholar</div>
                        <div className="border-r border-slate-300 px-4 py-3">School</div>
                        <div className="px-4 py-3">Course</div>
                      </div>

                      <div className="divide-y divide-slate-300">
                        {visibleScholars.map((scholar, index) => (
                          <article
                            key={scholar.application_id}
                            className="grid grid-cols-[68px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)] bg-white text-sm text-slate-700"
                          >
                            <div className="border-r border-slate-300 px-3 py-4 text-center font-semibold text-slate-500">
                              {String(currentScholarPage * SCHOLARS_PER_PAGE + index + 1).padStart(2, '0')}
                            </div>
                            <div className="border-r border-slate-300 px-4 py-4">
                              <p className="font-semibold uppercase tracking-[0.08em] text-brand-primary">
                                {formatBoardExamName(scholar.applicant_name)}
                              </p>
                            </div>
                            <div className="border-r border-slate-300 px-4 py-4 text-slate-600">
                              {scholar.school || 'Not specified'}
                            </div>
                            <div className="px-4 py-4 text-slate-600">
                              {scholar.course || 'Not specified'}
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 md:hidden">
                      {visibleScholars.map((scholar, index) => (
                        <article key={scholar.application_id} className="border border-slate-300 bg-white p-4 text-sm shadow-sm">
                          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Entry No.</p>
                              <p className="mt-1 text-base font-semibold text-slate-700">
                                {String(currentScholarPage * SCHOLARS_PER_PAGE + index + 1).padStart(2, '0')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Scholar</p>
                              <p className="mt-1 max-w-[180px] font-semibold uppercase tracking-[0.06em] text-brand-primary">
                                {formatBoardExamName(scholar.applicant_name)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">School</p>
                              <p className="mt-1 text-slate-600">{scholar.school || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Course</p>
                              <p className="mt-1 text-slate-600">{scholar.course || 'Not specified'}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-col gap-2 border-t border-slate-300 pt-4 text-xs uppercase tracking-[0.14em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                      <p>Document released for public viewing</p>
                      <p>{postedScholars.length} accepted scholar{postedScholars.length === 1 ? '' : 's'} listed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {siteSettings.facebookPageUrl && (
          <section className="border-t border-slate-300 bg-white py-16">
            <div className="mx-auto max-w-5xl px-4 md:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Socials</p>
                <h2 className="mt-3 font-display text-3xl font-bold text-brand-primary md:text-4xl xl:text-5xl">
                  Follow our official Facebook page
                </h2>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  Stay informed about scholarship announcements, schedules, and public updates from the City Government of Vigan.
                </p>
              </div>

              <div className="mx-auto mt-10 max-w-3xl border border-slate-300 bg-slate-50 p-6 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-sm">
                      <FacebookIcon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Official Facebook Page</p>
                      <h3 className="mt-1 font-display text-2xl font-bold text-brand-primary">
                        {siteSettings.facebookPageName || 'City Government of Vigan'}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {siteSettings.facebookPageDescription || 'Follow the official page for scholarship updates, announcements, and important public notices.'}
                      </p>
                    </div>
                  </div>

                  <a
                    href={siteSettings.facebookPageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-[#1877F2] bg-[#1877F2] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1669d8]"
                  >
                    <FacebookIcon />
                    Follow Page
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-300 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <SealPlaceholder small />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary">
                Heritage City of Vigan
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-brand-primary">
                Scholarship Portal
              </p>
              <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
                Digital services for scholarship application, document submission, and applicant status monitoring.
              </p>
            </div>
          </div>

          <div className="grid gap-8 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p className="font-semibold uppercase tracking-[0.15em] text-brand-primary">Portal Links</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link to="/login" className="hover:text-brand-primary">Login</Link>
                <Link to="/register" className="hover:text-brand-primary">Apply</Link>
              </div>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-[0.15em] text-brand-primary">Information</p>
              <div className="mt-3 flex flex-col gap-2">
                <a href="#how-it-works" className="hover:text-brand-primary">Application Process</a>
                <a href="#faq" className="hover:text-brand-primary">Frequently Asked Questions</a>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-slate-200 px-4 pt-6 text-xs text-slate-500 md:px-8">
          © {new Date().getFullYear()} City Government of Vigan. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
