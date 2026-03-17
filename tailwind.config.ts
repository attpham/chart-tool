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
      colors: {
        accent: {
          DEFAULT: '#0FBF3E',
          1: '#BFFFD1',
          2: '#8CF2A6',
          3: '#5FED83',
          4: '#0FBF3E',
          5: '#08872B',
          6: '#0A241B',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
