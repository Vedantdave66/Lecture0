import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/theme';

type Props = {
  message: string;
  type?: 'warning' | 'error' | 'info';
};

const BG   = { warning: '#FFF8E1', error: '#FFF0F0', info: '#F0F8FF' };
const BORD = { warning: '#FFD54F', error: '#FFCDD2', info: '#BBDEFB' };
const CLR  = { warning: '#7A5800', error: colors.danger, info: '#1565C0' };
const ICON = { warning: '⚠️', error: '⛔', info: 'ℹ️' };

export const WarningCard = ({ message, type = 'warning' }: Props) => (
  <View style={[styles.card, { backgroundColor: BG[type], borderColor: BORD[type] }]}>
    <Text style={[styles.text, { color: CLR[type] }]}>{ICON[type]} {message}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    marginVertical: 6,
    width: '100%',
  },
  text: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
