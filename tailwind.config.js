/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'square-light': '#f0d9b5',
        'square-dark': '#b58863',
        'square-light-dark': '#f0d9b5',
        'square-dark-dark': '#b58863',
      },
    },
  },
  plugins: [],
}
