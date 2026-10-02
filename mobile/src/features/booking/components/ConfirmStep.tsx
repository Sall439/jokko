import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Notice';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { TextField } from '@/components/ui/TextField';
import { Brand, Typography } from '@/constants/brand';
import { CABINET_RULES } from '@/constants/cabinet-rules';
import type { Dentist } from '@/types/dentist';
import type { Service } from '@/types/service';
import { getDentistDisplayName } from '@/types/dentist';
import { formatLongDate } from '@/utils/date';
import { minutesToLabel } from '@/utils/time';
import { formatFcfa } from '@/utils/currency';
import { capitalize } from '@/utils/text';

type Props = {
  dentist: Dentist;
  service: Service;
  /** Jour retenu, au format `YYYY-MM-DD`. */
  dateKey: string;
  /** Début retenu, en minutes depuis minuit. */
  startMinutes: number;
  /** Durée du soin, en minutes. */
  durationMinutes: number;

  motif: string;
  onChangeMotif: (value: string) => void;

  submitError: string | null;
};

/**
 * Étape « Confirmation » du parcours : récapitulatif, motif facultatif et
 * rappel des règles du cabinet. Le bouton d'envoi reste dans l'écran, cette
 * étape ne fait que préparer la demande.
 */
export function ConfirmStep({
  dentist,
  service,
  dateKey,
  startMinutes,
  durationMinutes,
  motif,
  onChangeMotif,
  submitError,
}: Props) {
  const endMinutes = startMinutes + durationMinutes;

  return (
    <View style={styles.section}>
      <View>
        <SectionTitle icon="check-square">Récapitulatif</SectionTitle>
        <Card>
          <SummaryRow icon="user" label="Praticien" value={getDentistDisplayName(dentist)} />
          <SummaryRow icon="activity" label="Soin" value={service.name} />
          <SummaryRow icon="tag" label="Tarif" value={formatFcfa(service.priceFcfa)} />
          <SummaryRow
            icon="calendar"
            label="Date"
            value={capitalize(formatLongDate(new Date(dateKey)))}
          />
          <SummaryRow
            icon="clock"
            label="Heure"
            value={`${minutesToLabel(startMinutes)} – ${minutesToLabel(endMinutes)}`}
          />
        </Card>
      </View>

      <View>
        <SectionTitle icon="edit-3">Motif (facultatif)</SectionTitle>
        <TextField
          label="Motif de la consultation"
          placeholder="Ex. douleur, contrôle, détartrage…"
          value={motif}
          onChangeText={onChangeMotif}
          multiline
          maxLength={200}
          helper={`${motif.length}/200 caractères. Décrivez brièvement votre besoin.`}
        />
      </View>

      <Notice tone="info" title="Votre demande sera en attente">
        Le cabinet confirme votre rendez-vous. Vous recevrez le statut « Confirmé » dès que votre
        demande est validée.
      </Notice>

      <View style={styles.rules}>
        {CABINET_RULES.slice(0, 3).map((rule) => (
          <View key={rule.title} style={styles.rule}>
            <Feather name="shield" size={14} color={Brand.colors.primary} />
            <Text style={styles.ruleText}>{rule.text}</Text>
          </View>
        ))}
      </View>

      {submitError ? <Notice tone="danger">{submitError}</Notice> : null}
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: 'user' | 'activity' | 'tag' | 'calendar' | 'clock';
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Feather name={icon} size={16} color={Brand.colors.primary} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Brand.spacing.xl },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.md,
    paddingVertical: Brand.spacing.md,
  },
  rowLabel: { ...Typography.sm, color: Brand.colors.textMuted, width: 80 },
  rowValue: {
    ...Typography.bodyMedium,
    color: Brand.colors.primaryDark,
    flex: 1,
    textAlign: 'right',
  },

  rules: { gap: Brand.spacing.sm },
  rule: { flexDirection: 'row', alignItems: 'flex-start', gap: Brand.spacing.sm },
  ruleText: { ...Typography.xs, color: Brand.colors.textMuted, flex: 1 },
});
