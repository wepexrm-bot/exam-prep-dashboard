/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#F6F5F0',
          dark: '#111110',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1C1C1A',
          2: '#EDECE7',
          '2-dark': '#242421',
          3: '#E4E2DB',
          '3-dark': '#2C2C29',
        },
        primary: '#2563EB',
        'primary-light': '#DBEAFE',
        success: '#16A34A',
        'success-light': '#DCFCE7',
        'success-mid': '#22C55E',
        purple: { DEFAULT: '#7C3AED', light: '#EDE9FE' },
        amber: { DEFAULT: '#D97706', light: '#FEF3C7' },
        danger: { DEFAULT: '#DC2626', light: '#FEE2E2' },
        pink: '#DB2777',
        teal: { DEFAULT: '#0D9488', light: '#CCFBF1' },
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
