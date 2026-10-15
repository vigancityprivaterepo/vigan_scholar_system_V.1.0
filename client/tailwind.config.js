/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Type scale: every size class resolves to a token in src/index.css (:root).
    // 1.2 ratio from a 16px base; xs and sm share the 14px floor, 4xl-6xl share the display step.
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
    // Three weights per family. "bold" maps to semibold so headings never go heavier than 600.
    fontWeight: {
      normal: 'var(--weight-regular)',
      medium: 'var(--weight-medium)',
      semibold: 'var(--weight-strong)',
      bold: 'var(--weight-strong)',
    },
    extend: {
      colors: {
        indigo: {
          950: '#0c2340',
        },
        brand: {
          primary: '#0c2340',
          green: '#10b981',
          teal: '#059669',
          bg: '#f0fdf4',
          dark: '#064e3b',
        },
      },
      fontFamily: {
        display: ['var(--font-heading)'],
        body: ['var(--font-body)'],
        sans: ['var(--font-body)'],
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
