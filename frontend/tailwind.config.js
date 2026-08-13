/** @type {import('tailwindcss').Config} */

/* Design tokens for onenight.
   ---------------------------------------------------------------------------
   Ported verbatim from the `tailwind.config` object that used to live in a
   <script> tag in index.html, back when Tailwind was applied by the Play CDN
   at runtime. Every value here is the same value it was there — this file is
   a move, not a redesign. See the commit that introduced it.
   --------------------------------------------------------------------------- */
export default {
  // index.html still carries classes (none today, but it is the document
  // shell), and every component lives under src/.
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgba(110,44,44,0.08)',
        ink: '#1A1714',
        muted: '#8A847C',
        line: '#E8E4DE', // "border" is reserved by Tailwind
        brand: '#8B3A3A',
        'brand-dark': '#6E2C2C',
        'brand-light': '#F0E8E8',
        success: '#4A7C59',
      },
      fontFamily: {
        display: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
        body: ['"Assistant"', 'system-ui', 'sans-serif'],
        /* No webfont: `font-mono` is unused today, so this maps straight to
           the system monospace stack rather than pulling another download. */
        mono: ['ui-monospace', 'monospace'],
        /* editorial luxury pairing — Latin glyphs from these, Hebrew falls back gracefully */
        playfair: ['Playfair Display', 'serif'],
        jost: ['"Jost"', '"Assistant"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.125rem', { lineHeight: '1.7rem' }],
        xl: ['1.25rem', { lineHeight: '1.8rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.9rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.2rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        display: [
          'clamp(2.75rem, 7vw, 5rem)',
          { lineHeight: '1.04', letterSpacing: '-0.01em' },
        ],
      },
      transitionTimingFunction: {
        lux: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        modal:
          '0 24px 70px rgba(26,23,20,0.28), 0 6px 18px rgba(26,23,20,0.10)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'heart-pop': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.28)' },
          '100%': { transform: 'scale(1)' },
        },
        bob: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(7px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .3s ease forwards',
        'scale-in': 'scale-in .3s cubic-bezier(0.22,1,0.36,1) forwards',
        'heart-pop': 'heart-pop .35s ease',
        bob: 'bob 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
