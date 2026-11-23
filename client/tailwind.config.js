/** @type {import('tailwindcss').Config} */
// Vigan Scholarship design system v2: emerald + navy, Source Serif 4 / Source Sans 3.
// Every value maps to a CSS variable in src/index.css so components and Tailwind stay in sync.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontSize: {
      xs: ['var(--text-small)', { lineHeight: 'var(--leading-dense)' }],
      sm: ['var(--text-small)', { lineHeight: 'var(--leading-dense)' }],
      base: ['var(--text-body)', { lineHeight: 'var(--leading-body)' }],
      lg: ['var(--text-title)', { lineHeight: 'var(--leading-title)' }],
      xl: ['var(--text-title)', { lineHeight: 'var(--leading-title)' }],
      '2xl': ['var(--text-section)', { lineHeight: 'var(--leading-heading)' }],
      '3xl': ['var(--text-page)', { lineHeight: 'var(--leading-heading)' }],
      '4xl': ['var(--text-display)', { lineHeight: 'var(--leading-heading)' }],
      '5xl': ['var(--text-display)', { lineHeight: 'var(--leading-heading)' }],
      '6xl': ['var(--text-display)', { lineHeight: 'var(--leading-heading)' }],
    },
    fontWeight: {
      normal: 'var(--weight-regular)',
      medium: 'var(--weight-medium)',
      semibold: 'var(--weight-strong)',
      bold: 'var(--weight-bold)',
    },
    extend: {
      colors: {
        indigo: { 950: '#0c2340' },
        brand: {
          primary: '#0c2340',   // navy: headings, dark surfaces, selected chips
          green: '#10b981',     // emerald-500: accents, badges on dark
          teal: '#047857',      // emerald-700: primary action (AA on white)
          bg: '#f0fdf4',        // mint: tinted panels, table headers
          dark: '#064e3b',      // emerald-900: sidebar, app headers
          page: '#eaf4ef',      // page background
          line: '#cfe5da',      // card borders
          divider: '#d9ebe2',
        },
        status: {
          'pending-bg': '#f1f5f9', 'pending-fg': '#334155',
          'incomplete-bg': '#ffedd5', 'incomplete-fg': '#9a3412',
          'screening-bg': '#dbeafe', 'screening-fg': '#1e40af',
          'exam-bg': '#e0e7ff', 'exam-fg': '#3730a3',
          'approved-bg': '#ccfbf1', 'approved-fg': '#115e59',
          'accepted-bg': '#dcfce7', 'accepted-fg': '#166534',
          'rejected-bg': '#fee2e2', 'rejected-fg': '#991b1b',
          'warn-bg': '#fef3c7', 'warn-fg': '#92400e',
        },
      },
      fontFamily: {
        display: ['var(--font-heading)'],
        body: ['var(--font-body)'],
        sans: ['var(--font-body)'],
      },
      borderRadius: {
        control: '10px',   // inputs, small buttons (desktop)
        button: '12px',    // buttons (mobile), list rows
        card: '18px',      // cards, panels
        sheet: '28px',     // bottom sheets
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,35,64,.05), 0 6px 18px rgba(12,35,64,.06)',
        raised: '0 20px 48px rgba(12,35,64,.16)',
        cta: '0 2px 4px rgba(4,120,87,.2), 0 10px 24px rgba(4,120,87,.25)',
        focus: '0 0 0 4px #d1fae5',
      },
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        fast: 'var(--t-fast)',
        med: 'var(--t-med)',
        slow: 'var(--t-slow)',
      },
      animation: {
        'slide-up': 'slideUp var(--t-slow) var(--ease-out) both',
        'pulse-ring': 'pulseRing 1.8s var(--ease-out) infinite',
        spin: 'spin 700ms linear infinite',
        'pop-in': 'popIn var(--t-med) var(--ease-spring) both',
        'fade-in': 'fadeIn var(--t-med) var(--ease-out) both',
        'grow-x': 'growX 900ms var(--ease-out) both',
        shake: 'shake 360ms var(--ease-out)',
        'slide-in-right': 'slideInRight var(--t-slow) var(--ease-spring) both',
        'slide-in-left': 'slideInLeft var(--t-slow) var(--ease-spring) both',
        'sheet-up': 'sheetUp var(--t-slow) var(--ease-spring) both',
        'from-right': 'fromRight var(--t-slow) var(--ease-out) both',
        'from-left': 'fromLeft var(--t-slow) var(--ease-out) both',
      },
      keyframes: {
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseRing: { '0%': { transform: 'scale(1)', opacity: '.55' }, '100%': { transform: 'scale(2.1)', opacity: '0' } },
        popIn: { from: { opacity: '0', transform: 'scale(.92)' }, to: { opacity: '1', transform: 'scale(1)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        growX: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        sheetUp: { from: { transform: 'translateY(120%)' }, to: { transform: 'translateY(0)' } },
        fromRight: { from: { opacity: '0', transform: 'translateX(40px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        fromLeft: { from: { opacity: '0', transform: 'translateX(-40px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
