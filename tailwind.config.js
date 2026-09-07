/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FBFAF8',
        line: '#E7E3DC',
        ink: {
          900: '#0F1317',
          700: '#272D35',
          500: '#5B6470',
          400: '#7C8593',
          300: '#9AA2AE',
        },
        brand: {
          50: '#EFF5F2',
          100: '#DBE9E3',
          200: '#BCD5CA',
          300: '#93B9A9',
          400: '#5D9581',
          500: '#337560',
          600: '#275C4C',
          700: '#1D473B',
          800: '#153429',
          900: '#0E241C',
        },
        clay: {
          50: '#FBF1EC',
          100: '#F4DFD4',
          400: '#D27953',
          500: '#BB5E3B',
          600: '#9E4B2C',
        },
        amber: {
          50: '#FBF4E4',
          100: '#F4E5C2',
          600: '#A87A1B',
          700: '#84600F',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,19,23,0.04), 0 8px 24px -12px rgba(15,19,23,0.10)',
        lift: '0 2px 4px rgba(15,19,23,0.04), 0 18px 40px -20px rgba(15,19,23,0.22)',
      },
      maxWidth: {
        content: '76rem',
      },
    },
  },
  plugins: [],
}
