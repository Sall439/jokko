import { Feather } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Brand, Typography } from '@/constants/brand';
import { formatMediumDate } from '@/utils/date';
import type { PatientSummary } from '@/types/patient';
import { getPatientDisplayName } from '@/types/patient';

/**
 * Patient suivi par le praticien : identité, téléphone, nombre de consultations
 * et dernière visite.
 *
 * Aucune donnée médicale n'est affichée (A3) : le mobile ne tient pas de
 * dossier, seulement un annuaire utile au moment de la consultation.
 */

type Props = {
  patient: PatientSummary;
};

export function PatientRow({ patient }: Props) {
  const initials =
    `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase() || '?';

  return (
    <View style={styles.card}>
      <Avatar initials={initials} tone="soft" />

      <View style={styles.body}>
        <Text style={styles.name}>{getPatientDisplayName(patient)}</Text>

        {patient.phone ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Appeler le ${patient.firstName} ${patient.lastName}`}
            onPress={() => void Linking.openURL(`tel:${patient.phone.replace(/\s/g, '')}`)}
            style={({ pressed }) => [styles.phoneRow, pressed && styles.pressed]}
          >
            <Feather name="phone" size={12} color={Brand.colors.primary} />
            <Text style={styles.phone}>{patient.phone}</Text>
          </Pressable>
        ) : null}

        <Text style={styles.stats}>
          {patient.visitCount > 0
            ? `${patient.visitCount} consultation${patient.visitCount > 1 ? 's' : ''}`
            : 'Aucune consultation'}
          {patient.lastVisitAt
            ? ` · dernière visite le ${formatMediumDate(patient.lastVisitAt)}`
            : ''}
        </Text>
      </View>

      {patient.upcomingCount > 0 ? (
        <View style={styles.badge}>
          <Feather name="calendar" size={11} color={Brand.colors.primary} />
          <Text style={styles.badgeText}>{patient.upcomingCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.md,
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    padding: Brand.spacing.md,
  },
  body: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, color: Brand.colors.primaryDark },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.xs },
  phone: { ...Typography.sm, color: Brand.colors.primary },
  pressed: { opacity: 0.7 },
  stats: { ...Typography.xs, color: Brand.colors.textMuted },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Brand.colors.primarySoft,
    borderRadius: Brand.radius.pill,
    paddingHorizontal: Brand.spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { ...Typography.xs, color: Brand.colors.primaryDark },
});
