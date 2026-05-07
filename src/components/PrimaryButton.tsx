import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { cardShadows, radius } from '../theme/theme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
};

export const PrimaryButton = ({ label, onPress, loading = false, disabled = false, variant = 'primary' }: Props) => (
  <Pressable
    style={({ pressed }) => [
      styles.base,
      variant === 'outline' ? styles.outline : styles.filled,
      (disabled || loading) && styles.disabled,
      pressed && styles.pressed,
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    accessibilityRole="button"
  >
    {loading
      ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.accent} size="small" />
      : <Text style={[styles.label, variant === 'outline' && styles.labelOutline]}>{label}</Text>
    }
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  filled: {
    backgroundColor: colors.accent,
    ...cardShadows.accent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  label: { color: colors.white, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  labelOutline: { color: colors.accent },
});
