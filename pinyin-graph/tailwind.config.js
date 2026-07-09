/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF3E6',
          100: '#FFE2C2',
          300: '#FFB366',
          500: '#FF8C42',
          700: '#CC5E1E',
          900: '#7A330E',
        },
        shengmu: {
          DEFAULT: '#E85D75',
          dark: '#FF7A95',
        },
        yunmu: {
          DEFAULT: '#00C9A7',
          dark: '#33E6C4',
        },
        pinyin: {
          DEFAULT: '#FFD15C',
          text: '#7A4F00',
          darkText: '#3D2800',
        },
        learning: {
          DEFAULT: '#6C5CE7',
          dark: '#A29BFE',
        },
        surface: {
          DEFAULT: '#FFFBF7',
          dark: '#1A1D2E',
          card: { DEFAULT: '#FFFFFF', dark: '#252842' },
          elevated: { DEFAULT: '#FFFFFF', dark: '#2E3250' },
        },
        divider: {
          DEFAULT: '#F0E6DE',
          dark: '#3A3F5C',
        },
        'divider-strong': {
          DEFAULT: '#E5D8CE',
          dark: '#4A5070',
        },
        content: {
          primary: { DEFAULT: '#2D2420', dark: '#F5F1EC' },
          secondary: { DEFAULT: '#6B6058', dark: '#B8B2C4' },
          tertiary: { DEFAULT: '#9E938A', dark: '#7A7F99' },
        },
        state: {
          success: { DEFAULT: '#2ECC71', dark: '#4DFF88' },
          error: { DEFAULT: '#E74C3C', dark: '#FF6B6B' },
          warning: { DEFAULT: '#F1C40F', dark: '#FFD93D' },
          info: { DEFAULT: '#3498DB', dark: '#5DADE2' },
          disabled: { DEFAULT: '#D1C7C0', dark: '#5A5F7A' },
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
