import type { Config } from 'tailwindcss';

/**
 * Los valores viven en `src/app/globals.css` como custom properties, replicando
 * exactamente los tokens del design system "Feria del Libro de Manizales".
 * Aquí solo los exponemos a Tailwind para poder escribir `bg-magenta`, `text-burgundy`, etc.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        burgundy: 'var(--color-burgundy)',
        'burgundy-soft': 'var(--color-burgundy-soft)',
        magenta: 'var(--color-magenta)',
        'magenta-2': 'var(--color-magenta-2)',
        pink: 'var(--color-pink)',
        'pink-light': 'var(--color-pink-light)',
        coral: 'var(--color-coral)',
        'coral-2': 'var(--color-coral-2)',
        yellow: 'var(--color-yellow)',
        'yellow-2': 'var(--color-yellow-2)',
        ivory: 'var(--color-ivory)',
        'ivory-2': 'var(--color-ivory-2)',
        cream: 'var(--color-cream)',
        'cream-white': 'var(--color-cream-white)',
        'surface-page': 'var(--surface-page)',
        'surface-card': 'var(--surface-card)',
        'surface-raised': 'var(--surface-raised)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'text-on-dark': 'var(--text-on-dark)',
        'border-soft': 'var(--border-soft)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        script: 'var(--font-script)',
      },
      borderRadius: {
        s: 'var(--radius-s)',
        m: 'var(--radius-m)',
        l: 'var(--radius-l)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
    },
  },
  plugins: [],
};

export default config;
