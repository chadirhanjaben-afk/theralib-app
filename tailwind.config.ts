import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Theralib Brand Colors
        brand: {
          'petrol': '#1B3C4D',
          'petrol-dark': '#15303F',
          'blue-gray': '#4A6670',
          'teal': '#5AAFAF',
          'teal-light': '#7ECFCF',
          'teal-bg': '#E8F6F6',
          'warm': '#F5A623',
          'wave-light': '#a8c4c6',
          'wave-mid': '#2d5f6b',
        },
      },
      fontFamily: {
        sans: ['var(--font-quicksand)', 'Quicksand', 'Nunito', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;