/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#04264b',
          50: '#e6eef5',
          100: '#cddde9',
          200: '#9cbbd4',
          300: '#6a99be',
          400: '#3977a9',
          500: '#04264b',
          600: '#031e3c',
          700: '#02172d',
          800: '#020f1e',
          900: '#01080f',
        },
        secondary: {
          DEFAULT: '#95c122',
          50: '#f4f9e8',
          100: '#e9f3d1',
          200: '#d3e7a3',
          300: '#bddb75',
          400: '#a7cf47',
          500: '#95c122',
          600: '#779a1b',
          700: '#597414',
          800: '#3c4d0e',
          900: '#1e2707',
        },
        neutral: {
          DEFAULT: '#c7c7c7',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#c7c7c7',
          500: '#a3a3a3',
          600: '#737373',
          700: '#525252',
          800: '#404040',
          900: '#262626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
