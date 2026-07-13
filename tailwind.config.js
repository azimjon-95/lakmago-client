/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Logodan olingan LokmaGo brend palitrasi
        brand: {
          50: '#FAEEDA',
          100: '#FAC775',
          400: '#EF9F27', // asosiy amber aksent
          600: '#BA7517',
          800: '#633806',
          ink: '#411E00', // to'q jigarrang (savatcha, sarlavhalar)
          text: '#2C1400',
        },
        ink: '#1A1A17',
        muted: '#6B6B66',
        line: '#EAE7DF',
        surface: '#FFFFFF',
        canvas: '#F7F5F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
