import animate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F7F5F0',
        elevated: '#FFFFFF',
        obsidian: '#1A1A1A',
        slate: {
          DEFAULT: '#6B6B6B',
          light: '#949494',
          dark: '#4A4A4A',
        },
        emerald: {
          primary: '#1A6B47',
          bright: '#22C55E',
          dark: '#135235',
          light: '#E8F5EE',
          glow: 'rgba(34, 197, 94, 0.25)',
        },
        telegram: {
          blue: '#2AABEE',
          dark: '#229ED9',
          light: '#E8F6FF',
          glow: 'rgba(42, 171, 238, 0.25)',
        },
        gold: {
          accent: '#D4A853',
          light: '#F0C878',
          dark: '#B88F3D',
          bg: '#FEFAEE',
          glow: 'rgba(212, 168, 83, 0.25)',
        },
        rose: {
          danger: '#FF3B30',
          light: '#FFEEEE',
          dark: '#CC2F26',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-display)', 'sans-serif'],
        mono: ['"Inter"', 'monospace'],
        numbers: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(26, 107, 71, 0.06)',
        'glass-hover': '0 12px 40px rgba(26, 107, 71, 0.12)',
        'glow-emerald': '0 0 20px rgba(34, 197, 94, 0.35)',
        'glow-gold': '0 0 20px rgba(212, 168, 83, 0.35)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(110%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.94) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-subtle': 'pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'slide-down': 'slide-down 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      backdropBlur: {
        xs: '2px',
        md: '12px',
      },
    },
  },
  plugins: [animate],
}
