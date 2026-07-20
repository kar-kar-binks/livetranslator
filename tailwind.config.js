/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        accent: {
          50: '#eef4ff',
          100: '#dfe9ff',
          200: '#c2d4ff',
          300: '#9ab5ff',
          400: '#6c8bff',
          500: '#4a63f5',
          600: '#3946d9',
          700: '#2f38b0',
          800: '#2a338c',
          900: '#262e6f',
        },
        surface: {
          light: '#f7f7fa',
          dark: '#101012',
        },
        panel: {
          light: '#ffffff',
          dark: '#18181b',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        'soft-dark': '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.45)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.24,0,0.38,1) infinite',
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
