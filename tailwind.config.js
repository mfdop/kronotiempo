/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        granate: {
          50:  '#F5E8EC',
          100: '#EDD0D9',
          200: '#D9A0B3',
          400: '#C4607A',
          600: '#7B1F3A',
          800: '#5C1629',
          900: '#3D0E1C',
        },
        arena: '#F7F3EE',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
    },
  },
  plugins: [],
}
