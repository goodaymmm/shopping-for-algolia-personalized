/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Refined, less saturated blue palette
        'algolia': {
          50: '#f6f9ff',
          100: '#ecf2ff',
          200: '#d9e5ff',
          300: '#b3ccff',
          400: '#809fff',
          500: '#5c7cfa',  // Primary - softer, more sophisticated
          600: '#4263eb',
          700: '#364fc7',
          800: '#2b3f94',
          900: '#1f2d5c',
        },
        // Warmer, sophisticated neutral palette
        'neutral': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#ebebeb',
          300: '#d6d6d6',
          400: '#adadad',
          500: '#858585',
          600: '#5c5c5c',
          700: '#333333',
          800: '#1f1f1f',
          850: '#1a1a1a',
          900: '#141414',
          950: '#0a0a0a',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],  // 10px
        'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],       // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.98)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.08)',
        'medium': '0 2px 8px 0 rgb(0 0 0 / 0.10)',
        'large': '0 4px 16px 0 rgb(0 0 0 / 0.12)',
        'focus': '0 0 0 3px rgb(92 124 250 / 0.2)',
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    }
  },
  plugins: []
}