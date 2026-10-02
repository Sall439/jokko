import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Brand, Typography } from '@/constants/brand';

type Props = {
  /** Encoche haute, fournie par `useSafeAreaInsets` dans l'écran. */
  topInset: number;
  onRegister: () => void;
  onLogin: () => void;
};

/**
 * Bandeau d'accueil de la page vitrine : identité du cabinet, promesse et
 * appel à l'action. Les visuels sont composés (dégradé de la charte et
 * cercles) car le projet ne contient aucune photo du cabinet et A3 interdit
 * d'en inventer.
 */
export function LandingHero({ topInset, onRegister, onLogin }: Props) {
  return (
    <LinearGradient
      colors={[Brand.colors.primaryDark, Brand.colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: topInset + Brand.spacing.xl }]}
    >
      <View pointerEvents="none" style={styles.decorLarge} />
      <View pointerEvents="none" style={styles.decorSmall} />

      <View style={styles.heroContent}>
        <View style={styles.logo}>
          <Text style={styles.logoMark}>🦷</Text>
        </View>

        <Text style={styles.brand} accessibilityRole="header">
          JokkoDentiste
        </Text>
        <Text style={styles.cabinet}>Cabinet Dentaire JokkoDentiste</Text>

        <Text style={styles.pitch}>
          Réservez votre rendez-vous en quatre étapes, directement depuis votre téléphone.
        </Text>

        <View style={styles.heroActions}>
          <Button label="Créer un compte patient" onPress={onRegister} block={false} />
          <Pressable
            accessibilityRole="link"
            onPress={onLogin}
            style={({ pressed }) => [styles.heroLink, pressed && styles.pressed]}
          >
            <Text style={styles.heroLinkText}>J&apos;ai déjà un compte</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Brand.spacing.xl,
    paddingBottom: Brand.spacing.xxl,
    overflow: 'hidden',
  },
  decorLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: Brand.colors.overlays.onPrimaryChip,
    top: -110,
    right: -80,
  },
  decorSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Brand.colors.overlays.onPrimaryHairline,
    bottom: -40,
    left: -30,
  },
  heroContent: { alignItems: 'center', gap: Brand.spacing.sm },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Brand.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: { fontSize: 40 },
  brand: { ...Typography.h1, color: Brand.colors.onPrimary, textAlign: 'center' },
  cabinet: {
    ...Typography.smStrong,
    color: Brand.colors.overlays.onPrimaryMuted,
    letterSpacing: 0.4,
  },
  pitch: {
    ...Typography.body,
    color: Brand.colors.onPrimary,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: Brand.spacing.sm,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.lg,
    marginTop: Brand.spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroLink: { minHeight: Brand.controlHeight, justifyContent: 'center' },
  heroLinkText: {
    ...Typography.bodyStrong,
    color: Brand.colors.onPrimary,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.7 },
});
