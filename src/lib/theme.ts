/**
 * Power Systems Inc - Theme Configuration
 * Centralized theme colors and utilities for easy access
 */

export const theme = {
  // Primary Brand Colors
  primary: {
    blue: '#2B4C7E',
    darkBlue: '#1A2F4F',
    red: '#D32F2F',
    lightBlue: '#4A6FA5',
    cream: '#F5F5F0',
  },

  // Secondary Colors
  secondary: {
    steel: '#607D8B',
    slate: '#455A64',
    gray: '#6B6B6B',
    lightGray: '#B0BEC5',
  },

  // Accent Colors
  accent: {
    white: '#FFFFFF',
    offWhite: '#FAFAFA',
    darkGray: '#2C2C2C',
    brightRed: '#E53935',
    softRed: '#FFEBEE',
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #2B4C7E 0%, #1A2F4F 100%)',
    accent: 'linear-gradient(135deg, #4A6FA5 0%, #2B4C7E 100%)',
    light: 'linear-gradient(135deg, #F5F5F0 0%, #FAFAFA 100%)',
  },
} as const;

/**
 * Get CSS variable value
 * @param variable - CSS variable name (e.g., '--primary-blue')
 */
export const getCSSVariable = (variable: string): string => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};

/**
 * Set CSS variable value
 * @param variable - CSS variable name (e.g., '--primary-blue')
 * @param value - Color value
 */
export const setCSSVariable = (variable: string, value: string): void => {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(variable, value);
};

/**
 * Tailwind class helpers for common theme patterns
 */
export const themeClasses = {
  // Button variants
  button: {
    primary: 'bg-primary-blue hover:bg-primary-darkBlue text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    secondary: 'bg-secondary-steel hover:bg-secondary-slate text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    danger: 'bg-primary-red hover:bg-accent-brightRed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
    outline: 'border-2 border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200',
  },

  // Input fields
  input: {
    default: 'w-full px-4 py-3 border border-secondary-lightGray rounded-lg focus:ring-2 focus:ring-primary-lightBlue focus:border-transparent transition-colors',
    error: 'w-full px-4 py-3 border-2 border-primary-red rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent transition-colors',
  },

  // Card variants
  card: {
    default: 'bg-white rounded-lg shadow-md p-6',
    elevated: 'bg-white rounded-lg shadow-lg p-6',
    bordered: 'bg-white rounded-lg border border-secondary-lightGray p-6',
  },

  // Text variants
  text: {
    heading: 'text-accent-darkGray font-bold',
    body: 'text-secondary-gray',
    muted: 'text-secondary-lightGray',
    primary: 'text-primary-blue',
    danger: 'text-primary-red',
  },
} as const;

/**
 * Commonly used color combinations
 */
export const colorCombinations = {
  // Hero sections
  hero: {
    background: 'bg-gradient-to-br from-primary-blue to-primary-darkBlue',
    text: 'text-white',
  },

  // Authentication pages
  auth: {
    background: 'bg-gradient-to-br from-primary-cream to-accent-offWhite',
    card: 'bg-white',
    primary: 'bg-primary-blue hover:bg-primary-darkBlue',
  },

  // Dashboard
  dashboard: {
    sidebar: 'bg-primary-darkBlue',
    content: 'bg-primary-cream',
    card: 'bg-white',
  },
} as const;

export default theme;
