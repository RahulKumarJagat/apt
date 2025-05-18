module.exports = {
  theme: {
    extend: {
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.8)'
          }
        }
      }
    }
  }
}