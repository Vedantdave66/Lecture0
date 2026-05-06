import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme/colors';

type Props = {
  isPlaying: boolean;
  onToggle: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
};

export const DrivingControls = ({ isPlaying, onToggle, onSkipBack, onSkipForward }: Props) => (
  <View style={styles.row}>
    <Pressable style={styles.sideButton} onPress={onSkipBack}>
      <Text style={styles.icon}>−30</Text>
    </Pressable>
    <Pressable style={styles.playButton} onPress={onToggle}>
      <Text style={styles.playIcon}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
    </Pressable>
    <Pressable style={styles.sideButton} onPress={onSkipForward}>
      <Text style={styles.icon}>+30</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: spacing.lg },
  playButton: { width: 154, height: 154, borderRadius: 77, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sideButton: { flex: 1, height: 104, alignItems: 'center', justifyContent: 'center', borderRadius: radii.xl, backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 },
  icon: { color: colors.text, fontSize: 26, fontWeight: '900' },
  playIcon: { color: colors.background, fontSize: 72, fontWeight: '900' }
});
