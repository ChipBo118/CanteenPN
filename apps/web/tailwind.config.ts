import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e9f7f1',
          100: '#d7f0e5',
          500: '#0ca678',
          600: '#087f5b',
          700: '#066b4d',
          900: '#17362f',
        },
        cream: '#fbfaf5',
      },
      boxShadow: {
        soft: '0 16px 44px rgba(17, 56, 45, 0.10)',
      },
      borderRadius: {
        '4xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;

