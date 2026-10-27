/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        field: { 50: '#EEF6EF', 100: '#D6EAD9', 200: '#ADD5B4', 300: '#7DBB89', 400: '#4F9D5E', 500: '#3FA34D', 600: '#2C8440', 700: '#1F6F3D', 800: '#185531', 900: '#123F25' },
        leafwhite: '#F4F8F2',
        soil: { DEFAULT: '#1C2A21', 600: '#3B4A40', 500: '#5B6B60', 400: '#86948A', 300: '#B9C4BC', 200: '#DCE4DE', 100: '#EDF1EE' },
        turmeric: { 50: '#FDF6E7', 100: '#FAE8C1', 400: '#EDB443', 500: '#E09A1B', 600: '#C27F0E', 700: '#9A630C' },
        chilli: { 500: '#D4621F', 600: '#B44F16' },
        river: { 50: '#EAF2FA', 100: '#CFE0F2', 500: '#2F78BF', 600: '#1D5E9B', 700: '#174B7C' },
        slateblue: { 50: '#EEF0F7', 500: '#4F5E96', 600: '#3A4A7A', 700: '#2D3A61' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', '"Noto Sans"', '"Noto Sans Devanagari"', '"Noto Sans Kannada"', '"Noto Sans Telugu"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.125rem' },
      boxShadow: {
        lift: '0 1px 2px rgba(28,42,33,.06), 0 6px 18px -8px rgba(28,42,33,.18)',
      },
    },
  },
  plugins: [],
};
