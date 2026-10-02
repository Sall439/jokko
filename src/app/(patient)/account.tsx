import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ActivitySummary } from '@/components/domain/ActivitySummary';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Typography } from '@/constants/brand';
import { CABINET_RULES } from '@/constants/cabinet-rules';
import { useAccountSummary } from '@/features/appointments/useAccountSummary';
import { useAuth } from '@/features/auth/useAuth';
import { formatFcfa } from '@/utils/currency';
import { getDisplayName, getInitials } from '@/utils/user';

/**
 * Onglet « Mon compte » (Phase 5) : identité, compteurs de rendez-vous,
 * règles du cabinet et déconnexion.
 *
 * Le profil vient de la session : il s'affiche donc même si le compteur de
 * rendez-vous n'a pas pu être chargé, et c'est dans ce cas qu'un « Réessayer »
 * est proposé plutôt qu'un écran d'erreur plein.
 */
export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const summary = useAccountSummary();
  if (!user) return null;

  return (
    <Screen onRefresh={summary.refresh} refreshing={summary.refreshing}>
      <Card>
        <View style={styles.identity}>
          <Avatar initials={getInitials(user)} size="lg" />
          <View style={styles.identityBody}>
            <Text style={styles.name} accessibilityRole="header">
              {getDisplayName(user)}
            </Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.phone}>{user.phone}</Text>
          </View>
        </View>
      </Card>

      {summary.loading ? (
        <Skeleton height={110} variant="block" />
      ) : summary.error ? (
        <ErrorState
          title="Compteurs indisponibles."
          detail={summary.error}
          onRetry={summary.refresh}
          retrying={summary.refreshing}
        />
      ) : (
        <ActivitySummary upcoming={summary.upcoming} completed={summary.completed} />
      )}

      <View>
        <SectionTitle icon="info">Règles du cabinet</SectionTitle>
        <Card>
          {CABINET_RULES.map((rule) => (
            <View key={rule.title} style={styles.rule}>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleText}>{rule.text}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.payment}>
        <Text style={styles.paymentTitle}>Tarifs</Text>
        <Text style={styles.paymentText}>
          Les soins sont indiqués en FCFA, par exemple {formatFcfa(25000)}. Le paiement se fait sur
          place.
        </Text>
      </View>

      <Button
        label="Se déconnecter"
        variant="outline"
        icon="log-out"
        onPress={() => void signOut()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.lg },
  identityBody: { flex: 1, gap: 2 },
  name: { ...Typography.h3, color: Brand.colors.primaryDark },
  email: { ...Typography.sm, color: Brand.colors.text },
  phone: { ...Typography.sm, color: Brand.colors.textMuted },

  rule: { gap: 2, paddingVertical: Brand.spacing.sm },
  ruleTitle: { ...Typography.smStrong, color: Brand.colors.primaryDark },
  ruleText: { ...Typography.sm, color: Brand.colors.text },

  payment: {
    backgroundColor: Brand.colors.primarySoft,
    borderRadius: Brand.radius.md,
    padding: Brand.spacing.lg,
    gap: Brand.spacing.xs,
  },
  paymentTitle: { ...Typography.smStrong, color: Brand.colors.primaryDark },
  paymentText: { ...Typography.sm, color: Brand.colors.text },
});
