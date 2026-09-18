/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        'primary-dark': '#3730a3',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        navy: '#172033',
        'ink-soft': '#6b7280',
        line: '#e6eaf0',
        paper: '#f5f7fb',
        'paper-dim': '#f8fafc',
        teal: '#0d9488',
        'teal-deep': '#115e59',
        pencil: '#9ca3af',
      },
      borderRadius: {
        DEFAULT: '10px',
      },
      boxShadow: {
        DEFAULT: '0 8px 30px rgba(23,32,51,.07)',
      },
    },
  },
  plugins: [],
};
