import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 10px 35px rgba(218, 132, 53, 0.16)',
      },
    },
  },
  plugins: [],
} satisfies Config
