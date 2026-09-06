/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens — driven by CSS variables so light/dark both work.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)', // page background
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // cards / panels
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)', // raised / hover
        ink: 'rgb(var(--c-ink) / <alpha-value>)', // primary text
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)', // secondary text
        'ink-faint': 'rgb(var(--c-ink-faint) / <alpha-value>)', // captions / meta
        line: 'rgb(var(--c-line) / <alpha-value>)', // borders / hairlines
        brass: 'rgb(var(--c-brass) / <alpha-value>)', // accent (gold/brass)
        'brass-soft': 'rgb(var(--c-brass-soft) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
      fontFamily: {
        // Editorial serif for display, clean sans for body.
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Jost', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.18em',
        wide2: '0.28em',
      },
      fontSize: {
        // Editorial display scale
        'display-lg': ['clamp(3rem, 7vw, 6rem)', { lineHeight: '1.02', letterSpacing: '-0.01em' }],
        'display': ['clamp(2.25rem, 5vw, 4rem)', { lineHeight: '1.05' }],
      },
      maxWidth: {
        editorial: '1240px',
      },
      boxShadow: {
        luxe: '0 24px 60px -28px rgb(var(--c-shadow) / 0.55)',
        'luxe-sm': '0 12px 30px -18px rgb(var(--c-shadow) / 0.45)',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.6s ease both',
      },
    },
  },
  plugins: [],
  // Keep MUI/Tailwind from fighting over base resets during the migration.
  corePlugins: {
    preflight: true,
  },
};
