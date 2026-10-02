import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { Brand, Typography } from '@/constants/brand';

type Props = { title: string; subtitle: string; showBack?: boolean; children: ReactNode };

export function AuthScreenLayout({ title, subtitle, showBack = true, children }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showBack ? (
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>
          ) : null}

          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoEmoji}>🦷</Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.colors.background },
  flex: { flex: 1 },
  scroll: { padding: Brand.spacing.xl, gap: Brand.spacing.xl, flexGrow: 1 },
  back: {
    alignSelf: 'flex-start',
    minHeight: Brand.hitTarget,
    justifyContent: 'center',
    paddingVertical: Brand.spacing.sm,
  },
  backText: { ...Typography.bodyStrong, color: Brand.colors.primary },
  header: { alignItems: 'center', gap: Brand.spacing.sm },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 34 },
  title: {
    ...Typography.h1,
    fontSize: Brand.fontSize.h2,
    color: Brand.colors.primaryDark,
    textAlign: 'center',
  },
  subtitle: { ...Typography.sm, color: Brand.colors.textMuted, textAlign: 'center', maxWidth: 320 },
});
