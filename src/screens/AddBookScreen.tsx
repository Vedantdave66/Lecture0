import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useLibraryStore } from '../store/libraryStore';
import { colors, radii, shadows, spacing, typography } from '../theme/colors';

type ImportOption = {
  title: string;
  subtitle: string;
  icon: string;
};

const options: ImportOption[] = [
  { title: 'Import PDF', subtitle: 'Choose a document and prepare it for AI narration. Demo mode only for now.', icon: '＋' },
  { title: 'Scan pages with camera', subtitle: 'Capture pages or covers. Camera preview is available; extraction comes later.', icon: '▣' },
  { title: 'Paste file link', subtitle: 'Add a public file URL when generation is connected.', icon: '↗' }
];

export const AddBookScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [link, setLink] = useState('');
  const seedDemoLibrary = useLibraryStore((state) => state.seedDemoLibrary);

  const handleComingSoon = (title: string) => {
    Alert.alert(title, 'AI narration generation is coming soon. For now, use the demo library to test playback and UI.');
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Add Book</Text>
      <Text style={styles.title}>Import or scan</Text>
      <Text style={styles.subtitle}>BookDrive will turn your PDFs and books into AI-ready audiobooks. This build focuses on the premium flow and demo playback.</Text>

      <View style={styles.optionsGrid}>
        {options.map((option) => (
          <Pressable key={option.title} style={styles.optionCard} onPress={() => handleComingSoon(option.title)}>
            <Text style={styles.optionIcon}>{option.icon}</Text>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.cameraCard}>
        <Text style={styles.cardTitle}>Camera scan preview</Text>
        <Text style={styles.cardText}>Use this preview to validate camera permission and layout before OCR/generation is built.</Text>
        <View style={styles.cameraShell}>
          {permission?.granted ? <CameraView style={styles.camera} facing="back" /> : <Text style={styles.cameraText}>Camera permission is needed for scan preview.</Text>}
        </View>
        <Pressable style={styles.secondaryButton} onPress={() => void requestPermission()}>
          <Text style={styles.secondaryText}>{permission?.granted ? 'Camera enabled' : 'Enable camera'}</Text>
        </Pressable>
      </View>

      <View style={styles.linkCard}>
        <Text style={styles.cardTitle}>Paste file link</Text>
        <TextInput value={link} onChangeText={setLink} placeholder="https://example.com/my-book.pdf" placeholderTextColor={colors.textSubtle} style={styles.input} />
        <Pressable style={styles.primaryButton} onPress={() => handleComingSoon('File link saved')}>
          <Text style={styles.primaryText}>Save link placeholder</Text>
        </Pressable>
      </View>

      <Pressable style={styles.demoButton} onPress={() => void seedDemoLibrary()}>
        <Text style={styles.demoText}>Load demo audiobooks</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: 170 },
  eyebrow: { color: colors.primary, fontSize: typography.caption, textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: '800' },
  title: { color: colors.text, fontSize: typography.title, fontWeight: '900', marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: typography.body, lineHeight: 23, marginTop: spacing.md, marginBottom: spacing.xl },
  optionsGrid: { gap: spacing.md },
  optionCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, borderColor: colors.border, borderWidth: 1, padding: spacing.lg, ...shadows.card },
  optionIcon: { color: colors.primary, fontSize: 30, fontWeight: '900', width: 40, textAlign: 'center' },
  optionCopy: { flex: 1 },
  optionTitle: { color: colors.text, fontSize: typography.subheading, fontWeight: '900' },
  optionSubtitle: { color: colors.textMuted, marginTop: spacing.xs, lineHeight: 21 },
  cameraCard: { backgroundColor: colors.surfaceElevated, borderRadius: radii.xl, borderColor: colors.border, borderWidth: 1, padding: spacing.lg, marginTop: spacing.xl },
  cardTitle: { color: colors.text, fontSize: typography.subheading, fontWeight: '900' },
  cardText: { color: colors.textMuted, marginTop: spacing.xs, lineHeight: 21 },
  cameraShell: { height: 220, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted, marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  camera: { width: '100%', height: '100%' },
  cameraText: { color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  secondaryButton: { marginTop: spacing.lg, borderColor: colors.primary, borderWidth: 1, borderRadius: radii.pill, padding: spacing.md, alignItems: 'center' },
  secondaryText: { color: colors.primary, fontWeight: '900' },
  linkCard: { backgroundColor: colors.surface, borderRadius: radii.xl, borderColor: colors.border, borderWidth: 1, padding: spacing.lg, marginTop: spacing.xl },
  input: { backgroundColor: colors.backgroundSoft, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, color: colors.text, padding: spacing.lg, marginTop: spacing.lg },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radii.pill, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  primaryText: { color: colors.background, fontWeight: '900' },
  demoButton: { backgroundColor: colors.surfaceElevated, borderColor: colors.primary, borderWidth: 1, borderRadius: radii.pill, padding: spacing.lg, alignItems: 'center', marginTop: spacing.xl },
  demoText: { color: colors.primary, fontWeight: '900' }
});
