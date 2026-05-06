import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme/colors';
import { TtsVoice } from '../types';

const voices: TtsVoice[] = ['alloy', 'echo', 'fable', 'nova'];

type Props = {
  selectedVoice: TtsVoice;
  selectedSpeed: number;
  onVoiceChange: (voice: TtsVoice) => void;
  onSpeedChange: (speed: number) => void;
};

export const VoiceSelector = ({ selectedVoice, selectedSpeed, onVoiceChange, onSpeedChange }: Props) => (
  <View style={styles.container}>
    <Text style={styles.label}>Voice preview</Text>
    <View style={styles.row}>
      {voices.map((voice) => (
        <Pressable key={voice} onPress={() => onVoiceChange(voice)} style={[styles.pill, selectedVoice === voice && styles.activePill]}>
          <Text style={[styles.pillText, selectedVoice === voice && styles.activeText]}>{voice}</Text>
        </Pressable>
      ))}
    </View>
    <Text style={styles.label}>Speed</Text>
    <View style={styles.row}>
      {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
        <Pressable key={speed} onPress={() => onSpeedChange(speed)} style={[styles.pill, selectedSpeed === speed && styles.activePill]}>
          <Text style={[styles.pillText, selectedSpeed === speed && styles.activeText]}>{speed}x</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  pill: { borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  activePill: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textMuted, textTransform: 'capitalize', fontWeight: '700' },
  activeText: { color: colors.background }
});
