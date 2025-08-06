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
      }
    },
  },
  plugins: [],
}