import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
      <Ionicons name="play-back" size={40} color={colors.text} />
      <Text style={styles.sideText}>30s</Text>
    </Pressable>
    <Pressable style={styles.playButton} onPress={onToggle}>
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={86} color={colors.background} />
    </Pressable>
    <Pressable style={styles.sideButton} onPress={onSkipForward}>
      <Ionicons name="play-forward" size={40} color={colors.text} />
      <Text style={styles.sideText}>30s</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  playButton: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  sideButton: { width: 96, height: 120, alignItems: 'center', justifyContent: 'center', borderRadius: 30, backgroundColor: colors.card },
  sideText: { color: colors.textMuted, marginTop: 8, fontSize: 18 }
});
