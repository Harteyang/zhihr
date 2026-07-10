/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--color-brand-50) / <alpha-value>)',
          100: 'rgb(var(--color-brand-100) / <alpha-value>)',
          300: 'rgb(var(--color-brand-300) / <alpha-value>)',
          500: 'rgb(var(--color-brand-500) / <alpha-value>)',
          700: 'rgb(var(--color-brand-700) / <alpha-value>)',
          900: 'rgb(var(--color-brand-900) / <alpha-value>)',
        },
        shengmu: 'rgb(var(--color-shengmu) / <alpha-value>)',
        yunmu: 'rgb(var(--color-yunmu) / <alpha-value>)',
        pinyin: {
          DEFAULT: 'rgb(var(--color-pinyin) / <alpha-value>)',
          text: 'rgb(var(--color-pinyin-text) / <alpha-value>)',
        },
        learning: 'rgb(var(--color-learning) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          card: 'rgb(var(--color-surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        },
        divider: 'rgb(var(--color-divider) / <alpha-value>)',
        'divider-strong': 'rgb(var(--color-divider-strong) / <alpha-value>)',
        content: {
          primary: 'rgb(var(--color-content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-content-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-content-tertiary) / <alpha-value>)',
        },
        state: {
          success: 'rgb(var(--color-state-success) / <alpha-value>)',
          error: 'rgb(var(--color-state-error) / <alpha-value>)',
          warning: 'rgb(var(--color-state-warning) / <alpha-value>)',
          info: 'rgb(var(--color-state-info) / <alpha-value>)',
          disabled: 'rgb(var(--color-state-disabled) / <alpha-value>)',
        },
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['1.75rem', { lineHeight: '1.3', fontWeight: '700' }],
        h2: ['1.375rem', { lineHeight: '1.35', fontWeight: '600' }],
        h3: ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-strong': ['1rem', { lineHeight: '1.6', fontWeight: '600' }],
        caption: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        tiny: ['0.6875rem', { lineHeight: '1.3', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(45, 36, 32, 0.05)',
        md: '0 4px 12px rgba(45, 36, 32, 0.08)',
        lg: '0 8px 24px rgba(45, 36, 32, 0.12)',
        colored: '0 4px 14px rgba(255, 140, 66, 0.25)',
        'colored-dark': '0 4px 14px rgba(255, 154, 92, 0.30)',
      },
    },
  },
  plugins: [],
}
