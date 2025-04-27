/**
 * Theme constants for the Milk Delivery App
 * This file contains all shared styling constants used throughout the app
 */

// Color palette
export const COLORS = {
  primary: '#4e9af1',
  primaryLight: '#e3f2fd',
  primaryDark: '#0b7bff',
  secondary: '#ff9800',
  secondaryLight: '#fff3e0',
  text: '#212121',
  textLight: '#757575',
  darkGray: '#757575',
  lightGray: '#f1f3f4',
  white: '#FFFFFF',
  black: '#000000',
  error: '#D32F2F',
  success: '#2E7D32',
  warning: '#ED6C02',
  info: '#0288D1',
  background: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E0E0E0'
};

// Font configuration
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32
  }
};

// Spacing and layout
export const SIZES = {
  padding: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  margin: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 50
  }
};

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  md: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8
  }
};

export default { COLORS, FONTS, SIZES, SHADOWS }; 