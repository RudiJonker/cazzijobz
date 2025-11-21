// src/styles/theme.js

export const COLORS = {
  // Primary
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  
  // Grayscale
  white: '#ffffff',
  gray100: '#f8fafc',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  black: '#000000',
  
  // Semantic
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#06b6d4',
};

export const SIZES = {
  // Padding & Margins
  padding: 12,
  margin: 16,
  
  // Border Radius
  radius: 8,
  radiusSmall: 4,
  radiusLarge: 12,
  
  // Font Sizes
  xxLarge: 28,
  xLarge: 24,
  large: 18,
  medium: 16,
  small: 14,
  xSmall: 12,
  
  // Icon Sizes
  icon: 24,
  iconLarge: 32,
};

// Light Theme
export const lightTheme = {
  colors: {
    // Core colors
    background: COLORS.white,
    text: COLORS.gray900,
    primary: COLORS.primary,
    
    // Card & surface colors
    card: COLORS.gray100,
    cardBorder: COLORS.gray200,
    
    // Semantic colors
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    info: COLORS.info,
    
    // Additional utilities
    border: COLORS.gray300,
    placeholder: COLORS.gray500,
  },
  sizes: SIZES  // Make sure this line exists!
};

// Dark Theme
export const darkTheme = {
  colors: {
    // Core colors
    background: COLORS.gray900,
    text: COLORS.white,
    primary: COLORS.primaryLight,
    
    // Card & surface colors
    card: COLORS.gray800,
    cardBorder: COLORS.gray700,
    
    // Semantic colors
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    info: COLORS.info,
    
    // Additional utilities
    border: COLORS.gray600,
    placeholder: COLORS.gray400,
  },
  sizes: SIZES  // Make sure this line exists!
};

