import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ApiKey'>;

const OPENAI_KEY_STORAGE = 'bookdrive:openai_key';

export const ApiKeyScreen = ({ navigation }: Props) => {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith('sk-')) {
      setError('OpenAI keys start with "sk-". Please check your key.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await AsyncStorage.setItem(OPENAI_KEY_STORAGE, trimmed);
      navigation.replace('MainTabs');
    } catch {
      setError('Failed to save key. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo / wordmark */}
        <Text style={styles.logo}>📚</Text>
        <Text style={styles.appName}>BookDrive</Text>
        <Text style={styles.tagline}>Your library. Your voice.</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.heading}>Add your OpenAI API Key</Text>
          <Text style={styles.body}>
            BookDrive uses OpenAI Text-to-Speech to convert books into audio. Your key is stored
            securely on this device and never sent anywhere except OpenAI.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="sk-..."
            placeholderTextColor="#555"
            value={key}
            onChangeText={(v) => {
              setKey(v);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => void handleSave()}
            accessibilityLabel="OpenAI API key input"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => void handleSave()}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Save API key and continue"
          >
            {saving ? (
              <ActivityIndicator color="#08080F" />
            ) : (
              <Text style={styles.buttonText}>Save &amp; Continue →</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Get your key at{' '}
          <Text style={styles.hintAccent}>platform.openai.com/api-keys</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08080F',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 56,
    marginBottom: 8,
  },
  appName: {
    color: '#E8C547',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagline: {
    color: '#888',
    fontSize: 14,
    marginBottom: 36,
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    backgroundColor: '#13131A',
    borderRadius: 24,
    padding: 24,
    borderColor: '#2a2a3a',
    borderWidth: 1,
    marginBottom: 20,
  },
  heading: {
    color: '#F5F5F5',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: '#999',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#08080F',
    color: '#F5F5F5',
    borderRadius: 14,
    borderColor: '#2a2a3a',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 14,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#E8C547',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#08080F',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  hint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
  hintAccent: {
    color: '#E8C547',
  },
});
