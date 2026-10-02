import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { Brand, Typography } from '@/constants/brand';
import { BookingStepsSection } from '@/features/auth/components/BookingStepsSection';
import { CabinetNotice } from '@/features/auth/components/CabinetNotice';
import { LandingHero } from '@/features/auth/components/LandingHero';
import { SpacesSection } from '@/features/auth/components/SpacesSection';

/**
 * Page vitrine (Phase 3) : hero, les deux espaces, les 4 étapes de réservation,
 * les règles du cabinet et l'appel à l'action.
 *
 * Aucun contenu inventé hors cahier des charges : ni messagerie, ni
 * téléconsultation, ni paiement en ligne.
 */
export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goLogin = () => router.push('/(auth)/login');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <OfflineBanner />

      <LandingHero
        topInset={insets.top}
        onRegister={() => router.push('/(auth)/register')}
        onLogin={goLogin}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Brand.spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SpacesSection />
        <BookingStepsSection />
        <CabinetNotice />

        <View style={styles.footerActions}>
          <Button label="Se connecter" onPress={goLogin} />
          <Text style={styles.footerHint}>
            L&apos;inscription en ligne est réservée aux patients. Les comptes praticiens sont créés
            par le cabinet.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.colors.background },
  scroll: { padding: Brand.spacing.lg, gap: Brand.spacing.xl },
  footerActions: { gap: Brand.spacing.md },
  footerHint: { ...Typography.xs, color: Brand.colors.textMuted, textAlign: 'center' },
});
