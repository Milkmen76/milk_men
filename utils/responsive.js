import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions we're designing for
const baseWidth = 375; // iPhone X width
const baseHeight = 812; // iPhone X height

// Scale factor based on screen width
const widthScale = SCREEN_WIDTH / baseWidth;
const heightScale = SCREEN_HEIGHT / baseHeight;

// Utility to scale sizes based on device screen size
export const scale = (size) => Math.round(size * widthScale);

// Utility to scale height dimensions
export const verticalScale = (size) => Math.round(size * heightScale);

// Utility for padding, margin, and font sizes - uses a more moderate scaling factor
export const moderateScale = (size, factor = 0.5) => {
  return Math.round(size + (scale(size) - size) * factor);
};

// Font scaling with safe minimum size
export const fontScale = (size) => {
  const scaledSize = moderateScale(size);
  return Math.max(scaledSize, size * 0.8); // Ensuring text never scales below 80% of original
};

// Safe area insets for notch devices and bottom navigation bars
export const getSafeAreaInsets = () => {
  const isIphoneX = Platform.OS === 'ios' && 
    (SCREEN_HEIGHT >= 812 || SCREEN_WIDTH >= 812);
  
  return {
    top: isIphoneX ? 44 : 20,
    bottom: isIphoneX ? 34 : 0,
    left: isIphoneX ? 44 : 0,
    right: isIphoneX ? 44 : 0,
  };
};

// Device specific helpers
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
export const isLargeDevice = SCREEN_WIDTH >= 414;
export const isTablet = SCREEN_WIDTH >= 768;

// Return responsive style values based on screen size
export const responsiveWidth = (percentage) => {
  return Math.round((percentage / 100) * SCREEN_WIDTH);
};

export const responsiveHeight = (percentage) => {
  return Math.round((percentage / 100) * SCREEN_HEIGHT);
};

// Get pixel density-based sizes
export const getPixelSizeForLayoutSize = (size) => {
  return PixelRatio.getPixelSizeForLayoutSize(size);
};

// Shadow utilities for cross-platform consistency
export const getShadowStyles = (elevation = 3) => {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.1,
      shadowRadius: elevation * 2,
    },
    android: {
      elevation: elevation,
    },
  });
};

// Common component size presets
export const SIZES = {
  // Text sizes
  TITLE: fontScale(22),
  SUBTITLE: fontScale(18),
  BODY: fontScale(16),
  CAPTION: fontScale(14),
  SMALL: fontScale(12),
  
  // Button sizes
  BUTTON_HEIGHT: verticalScale(48),
  BUTTON_WIDTH: responsiveWidth(85),
  ICON_BUTTON: scale(44),
  
  // Spacing
  PADDING_XS: scale(4),
  PADDING_S: scale(8),
  PADDING_M: scale(16),
  PADDING_L: scale(24),
  PADDING_XL: scale(32),
  
  // Border radius
  RADIUS_S: scale(4),
  RADIUS_M: scale(8),
  RADIUS_L: scale(16),
  RADIUS_XL: scale(24),
  RADIUS_ROUND: scale(999),
};
