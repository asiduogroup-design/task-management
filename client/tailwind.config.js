/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'ui-serif', 'serif'],
      },
      colors: {
        ink: '#18202f',
        field: '#f4f7fb',
        brand: '#2458d3',
        mint: '#2d9d78',
        amber: '#b7791f'
      },
      boxShadow: {
        soft: '0 18px 45px rgba(24, 32, 47, 0.08)'
      }
    }
  },
  plugins: []
};
