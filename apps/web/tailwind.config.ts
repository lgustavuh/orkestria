import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#7c6ef0', light: '#f0eeff', dark: '#5b4fc7', hover: '#6b5ce0' },
        warm: { 50: '#faf9f7', 100: '#f5f3f0', 200: '#ece9e3', 300: '#e2dfd8', 400: '#c5c0b8', 500: '#a09b8e' },
      },
      borderRadius: {
        'warm': '12px',
        'warm-lg': '16px',
        'warm-xl': '20px',
      },
    },
  },
  plugins: [],
};
export default config;
