export const COLORS = {
  primary: '#0D5C4E', // deep teal/green
  primaryDark: '#062E27',
  cardBg: 'rgba(255, 255, 255, 0.12)', // glassmorphism
  accent: '#F5A623', // warm orange
  secondaryAccent: '#FF6B35', // coral orange
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  tabBarBg: '#0A4A3E',
  tabInactive: 'rgba(255, 255, 255, 0.4)',
  searchBg: 'rgba(255, 255, 255, 0.15)',
  error: '#FF5252',
  success: '#4CAF50',
  skeleton: 'rgba(255, 255, 255, 0.08)',
};

export const SIZES = {
  radiusCard: 20,
  radiusButton: 30,
  radiusBanner: 24,
  radiusPill: 25,
  padding: 20,
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
};

export default {
  COLORS,
  SIZES,
  SHADOWS,
};
