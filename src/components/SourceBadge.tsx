import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Source = 'gutenberg' | 'upload' | 'demo' | string;

const LABEL: Record<string, string> = {
  gutenberg: '🌐 Gutenberg',
  upload:    '📁 Uploaded',
  demo:      '📚 Demo',
};

const BG: Record<string, string> = {
  gutenberg: '#FFF8E1',
  upload:    '#E8F5E9',
  demo:      '#F3E5F5',
};

const BORDER: Record<string, string> = {
  gutenberg: '#FFE082',
  upload:    '#A5D6A7',
  demo:      '#CE93D8',
};

type Props = { source: Source };

export const SourceBadge = ({ source }: Props) => (
  <View style={[styles.badge, { backgroundColor: BG[source] ?? '#F5F5F5', borderColor: BORDER[source] ?? '#DDD' }]}>
    <Text style={styles.text}>{LABEL[source] ?? source}</Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontWeight: '700', color: colors.text },
});
