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
        sans: ['Quicksand', 'Nunito', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;