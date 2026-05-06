import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

const grains = Array.from({ length: 36 }, (_, index) => ({
  key: `grain-${index}`,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 61) % 100}%`,
  size: 1 + (index % 3)
}));

export const TextureOverlay = () => (
  <View pointerEvents="none" style={styles.overlay}>
    {grains.map((grain) => <View key={grain.key} style={[styles.dot, { left: grain.left, top: grain.top, width: grain.size, height: grain.size }]} />)}
  </View>
);

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, opacity: 0.18 },
  dot: { position: 'absolute', borderRadius: 2, backgroundColor: colors.accentMuted }
});
