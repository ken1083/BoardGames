/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        appleGray: '#f5f5f7',
        appleDark: '#1d1d1f',
        appleBlue: '#007aff',
        appleGreen: '#34c759'
      }
    },
  },
  plugins: [],
}
