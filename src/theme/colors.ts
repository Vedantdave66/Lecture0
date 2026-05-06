import { Platform, ViewStyle } from 'react-native';

export const colors = {
  background: '#070A12',
  backgroundSoft: '#0B1020',
  surface: '#111827',
  surfaceElevated: '#182033',
  surfaceMuted: '#202A3F',
  primary: '#D6A84F',
  primarySoft: '#3A2D16',
  text: '#FFF7E8',
  textMuted: '#9CA6B8',
  textSubtle: '#677084',
  border: '#26324A',
  success: '#57C785',
  warning: '#F0B35B',
  danger: '#FF6B6B',
  black: '#000000'
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999
} as const;

export const typography = {
  title: 34,
  heading: 24,
  subheading: 18,
  body: 15,
  caption: 12,
  family: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' })
} as const;

export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.black,
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 }
    },
    android: { elevation: 4 },
    default: {}
  })
} as const;
