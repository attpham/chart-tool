import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Mona Sans"', 'sans-serif'],
        display: ['"Mona Sans Display"', 'sans-serif'],
        mono: ['"Mona Sans Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
