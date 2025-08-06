/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crypto: {
          dark: '#0B1426',
          darker: '#050A14',
          accent: '#00D2FF',
          gold: '#FFD700',
          green: '#00FF88',
          red: '#FF4757'
        }
      },
      animation: {
        'gradient-shift': 'gradient-shift 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'skeleton': 'skeleton 1.5s infinite linear',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'skeleton': {
          '0%': { 'background-position': '-200px 0' },
          '100%': { 'background-position': 'calc(200px + 100%) 0' },
        },
      }
    },
  },
  plugins: [],
}
