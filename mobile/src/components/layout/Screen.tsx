import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { OfflineBanner } from './OfflineBanner';
import { ScreenHeader } from './ScreenHeader';

type Props = {
  children: ReactNode;
  /** Zone défilante (défaut) ou contenu fixe qui occupe toute la hauteur. */
  scrollable?: boolean;
  /** Tirage vers le bas pour recharger (Phase 5, « Mes RDV »). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Masque le bandeau, pour un écran de saisie plein écran. */
  hideHeader?: boolean;
  /**
   * Barre d'action fixée en bas, hors de la zone défilante.
   *
   * Réserver un rendez-vous se fait en quatre étapes : le bouton « Continuer »
   * doit rester visible même quand la liste des soins occupe tout l'écran.
   */
  footer?: ReactNode;
};

/**
 * Cadre commun des écrans connectés (A5) : bandeau `ScreenHeader`, bandeau
 * hors ligne, zone sûre basse et zone de contenu. Gère le scroll et le
 * pull-to-refresh pour que les écrans restent minces (≤ 150 lignes).
 */
export function Screen({
  children,
  scrollable = true,
  onRefresh,
  refreshing = false,
  hideHeader = false,
  footer,
}: Props) {
  const insets = useSafeAreaInsets();
  const padding = { paddingBottom: insets.bottom + Brand.spacing.lg };
  const footerPadding = { paddingBottom: insets.bottom + Brand.spacing.md };

  return (
    <View style={styles.container}>
      {hideHeader ? null : <ScreenHeader />}

      <OfflineBanner />

      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.content, footer ? styles.withFooter : null, padding]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Brand.colors.primary}
                colors={[Brand.colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, footer ? styles.withFooter : null, padding]}>{children}</View>
      )}

      {footer ? <View style={[styles.footer, footerPadding]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.colors.background },
  content: { padding: Brand.spacing.lg, gap: Brand.spacing.md },
  withFooter: { paddingBottom: Brand.spacing.xl },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Brand.colors.border,
    backgroundColor: Brand.colors.surface,
    paddingHorizontal: Brand.spacing.lg,
    paddingTop: Brand.spacing.md,
    gap: Brand.spacing.sm,
  },
});
