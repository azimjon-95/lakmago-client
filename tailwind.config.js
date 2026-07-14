/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Logodan olingan LokmaGo brend palitrasi (o'zgarmaydi — aksentlar)
        brand: {
          50: '#3A2A12',   // dark rejimda "yorug' jigar" o'rniga to'q fon
          100: '#FAC775',
          400: '#EF9F27',  // asosiy amber aksent
          600: '#F0A838',
          800: '#633806',
          ink: '#FAC775',  // dark'da sarlavha aksentlari yorug'
          text: '#2C1400', // amber ustidagi to'q matn (tugmalar)
        },
        // ===== DARK THEME semantik ranglar =====
        canvas: '#0E0E10',   // eng orqa fon (deyarli qora)
        surface: '#1A1A1E',  // kartalar, panellar
        ink: '#F2F1EE',      // asosiy matn (och oq)
        muted: '#9A9A96',    // ikkilamchi matn (kulrang)
        line: '#2A2A30',     // chegaralar
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
