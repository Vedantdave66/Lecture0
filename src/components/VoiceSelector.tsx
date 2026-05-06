import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
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
    <Text style={styles.label}>AI voice</Text>
    <View style={styles.row}>
      {voices.map((voice) => (
        <Pressable key={voice} onPress={() => onVoiceChange(voice)} style={[styles.pill, selectedVoice === voice && styles.activePill]}>
          <Text style={[styles.pillText, selectedVoice === voice && styles.activeText]}>{voice}</Text>
        </Pressable>
      ))}
    </View>
    <Text style={styles.label}>Playback speed</Text>
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
  container: { gap: 10 },
  label: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: { borderColor: colors.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.card },
  activePill: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { color: colors.textMuted, textTransform: 'capitalize' },
  activeText: { color: colors.background, fontWeight: '700' }
});
