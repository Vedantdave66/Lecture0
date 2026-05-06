import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePlayerStore } from '../store/playerStore';
import { colors } from '../theme/colors';

type Props = {
  title?: string;
};

export const AudioPlayer = ({ title = 'Ready to listen' }: Props) => {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const toggle = usePlayerStore((state) => state.toggle);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.caption}>Now playing</Text>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <Pressable style={styles.button} onPress={() => void toggle()}>
        <Text style={styles.icon}>{isPlaying ? 'Ⅱ' : '▶'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { margin: 16, padding: 14, borderRadius: 20, backgroundColor: colors.cardElevated, borderColor: colors.border, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  caption: { color: colors.accent, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 15, marginTop: 3, maxWidth: 240 },
  button: { backgroundColor: colors.accent, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.background, fontSize: 22, fontWeight: '900' }
});
