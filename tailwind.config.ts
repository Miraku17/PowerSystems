import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors - Based on Power Systems Inc Brand
        primary: {
          blue: '#2B4C7E',           // Deep professional blue from logo
          'dark-blue': '#1A2F4F',    // Darker shade for hover states
          darkBlue: '#1A2F4F',       // Alias for compatibility
          red: '#D32F2F',            // Atomic logo red
          'light-blue': '#4A6FA5',   // Lighter blue for accents
          lightBlue: '#4A6FA5',      // Alias for compatibility
          cream: '#F5F5F0',          // Soft background
        },
        // Secondary Colors
        secondary: {
          steel: '#607D8B',          // Steel blue-gray
          slate: '#455A64',          // Dark slate
          gray: '#6B6B6B',           // Medium gray for text
          'light-gray': '#B0BEC5',   // Light gray for borders
          lightGray: '#B0BEC5',      // Alias for compatibility
        },
        // Accent Colors
        accent: {
          white: '#FFFFFF',          // Pure white
          'off-white': '#FAFAFA',    // Off-white for subtle backgrounds
          offWhite: '#FAFAFA',       // Alias for compatibility
          'dark-gray': '#2C2C2C',    // Dark charcoal for text
          darkGray: '#2C2C2C',       // Alias for compatibility
          'bright-red': '#E53935',   // Bright red for CTAs/highlights
          brightRed: '#E53935',      // Alias for compatibility
          'soft-red': '#FFEBEE',     // Soft red for backgrounds
          softRed: '#FFEBEE',        // Alias for compatibility
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2B4C7E 0%, #1A2F4F 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4A6FA5 0%, #2B4C7E 100%)',
        'gradient-light': 'linear-gradient(135deg, #F5F5F0 0%, #FAFAFA 100%)',
      },
      boxShadow: {
        'primary': '0 4px 6px -1px rgba(43, 76, 126, 0.1), 0 2px 4px -1px rgba(43, 76, 126, 0.06)',
        'primary-lg': '0 10px 15px -3px rgba(43, 76, 126, 0.1), 0 4px 6px -2px rgba(43, 76, 126, 0.05)',
        'red': '0 4px 6px -1px rgba(211, 47, 47, 0.1), 0 2px 4px -1px rgba(211, 47, 47, 0.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
