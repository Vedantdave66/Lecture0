import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  isPlaying: boolean;
  onToggle: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
};

export const DrivingControls = ({ isPlaying, onToggle, onSkipBack, onSkipForward }: Props) => (
  <View style={styles.row}>
    <Pressable style={styles.sideButton} onPress={onSkipBack}>
      <Text style={styles.icon}>↺</Text>
      <Text style={styles.sideText}>30s</Text>
    </Pressable>
    <Pressable style={styles.playButton} onPress={onToggle}>
      <Text style={styles.playIcon}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
    </Pressable>
    <Pressable style={styles.sideButton} onPress={onSkipForward}>
      <Text style={styles.icon}>↻</Text>
      <Text style={styles.sideText}>30s</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  playButton: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  sideButton: { width: 96, height: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 30, backgroundColor: colors.card },
  sideText: { color: colors.textMuted, marginTop: 8, fontSize: 18 },
  icon: { color: colors.text, fontSize: 44, fontWeight: '800' },
  playIcon: { color: colors.background, fontSize: 84, fontWeight: '900' }
});
