export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both',
        'fade-in': 'fadeIn 0.3s ease both',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
