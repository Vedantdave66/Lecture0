import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../components/PrimaryButton';
import { WarningCard } from '../components/WarningCard';
import { colors, typography } from '../theme/colors';
import { cardShadows, radius, spacing } from '../theme/theme';
import { RootStackParamList } from '../types';

const KEY = 'bookdrive:openai_key';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ApiKeyScreen = () => {
  const navigation = useNavigation<Nav>();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!apiKey.trim().startsWith('sk-')) {
      setError('API key must start with "sk-". Check your OpenAI dashboard.');
      return;
    }
    setSaving(true);
    await AsyncStorage.setItem(KEY, apiKey.trim());
    setSaving(false);
    navigation.navigate('MainTabs');
  };

  const skip = async () => {
    await AsyncStorage.setItem('bookdrive:tts_provider', 'device');
    navigation.navigate('MainTabs');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🔑</Text>
        <Text style={styles.heading}>OpenAI API Key</Text>
        <Text style={styles.body}>
          BookDrive uses OpenAI TTS for premium voices.{'\n'}
          You can skip this and use <Text style={styles.accent}>free device voice</Text> instead.
        </Text>

        <View style={[styles.card, cardShadows.soft]}>
          <TextInput
            style={styles.input}
            placeholder="sk-..."
            placeholderTextColor={colors.textLight}
            value={apiKey}
            onChangeText={(t) => { setApiKey(t); setError(''); }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          {error !== '' && <WarningCard message={error} type="error" />}
          <PrimaryButton label="Save & Continue" onPress={() => void save()} loading={saving} />
        </View>

        <Pressable onPress={() => void skip()} style={styles.skip}>
          <Text style={styles.skipText}>Skip — use Device Voice (free)</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: 16 },
  emoji: { fontSize: 60 },
  heading: { fontFamily: typography.titleFont, fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  accent: { color: colors.accent, fontWeight: '700' },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, width: '100%', gap: 12 },
  input: { backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, borderColor: colors.border, borderWidth: 1.5, fontSize: 15, color: colors.text },
  skip: { marginTop: 8 },
  skipText: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
