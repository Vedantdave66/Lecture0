import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveOpenAIKey } from '../services/ttsService';
import { colors, radii, spacing, typography } from '../theme/colors';

type Props = {
  onSaved: () => void;
};

export const ApiKeyScreen = ({ onSaved }: Props) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Paste your OpenAI API key to continue.');
      return;
    }

    setIsSaving(true);
    setError(null);
    await saveOpenAIKey(apiKey);
    setIsSaving(false);
    onSaved();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Setup</Text>
        <Text style={styles.title}>Add your OpenAI API key</Text>
        <Text style={styles.body}>BookDrive uses your key locally to generate demo audiobook chunks with OpenAI TTS. It is saved on this device under bookdrive:openai_key.</Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="sk-..."
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={() => void handleSave()} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>Save key</Text>}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, borderColor: colors.border, borderWidth: 1, padding: spacing.xl },
  eyebrow: { color: colors.primary, fontSize: typography.caption, textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: '900' },
  title: { color: colors.text, fontSize: typography.title, fontWeight: '900', marginTop: spacing.sm },
  body: { color: colors.textMuted, fontSize: typography.body, lineHeight: 23, marginTop: spacing.md },
  input: { backgroundColor: colors.backgroundSoft, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, color: colors.text, padding: spacing.lg, marginTop: spacing.xl },
  error: { color: colors.danger, marginTop: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: radii.pill, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xl },
  buttonText: { color: colors.background, fontWeight: '900' }
});
