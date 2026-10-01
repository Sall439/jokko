/** @type {import('tailwindcss').Config} */
// Charte graphique JokkoDentiste (cahier des charges, section 7).
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A7E8A',
          dark: '#08505B',
          soft: '#E1F3F5',
        },
        fond: '#F4FAFB',
        texte: {
          DEFAULT: '#12303A',
          secondaire: '#5B7580',
        },
        succes: '#2E9E6B',
        attention: '#E09A12',
        erreur: '#D6404A',
        carte: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Poppins', 'Arial', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        h1: ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
        h2: ['1.5rem', { lineHeight: '1.3', fontWeight: '700' }],
        h3: ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
      },
      borderRadius: {
        bouton: '8px',
        carte: '12px',
      },
      boxShadow: {
        carte: '0 1px 2px rgba(18, 48, 58, 0.06), 0 4px 16px rgba(18, 48, 58, 0.04)',
      },
    },
  },
  plugins: [],
}
