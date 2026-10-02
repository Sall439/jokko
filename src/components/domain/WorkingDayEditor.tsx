import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Brand, Typography } from '@/constants/brand';
import type { WeekdayIndex, WorkingDay } from '@/types/availability';
import { WEEKDAYS } from '@/types/availability';
import { labelToMinutes, minutesToLabel } from '@/utils/time';

/**
 * Éditeur d'une journée de travail (écran « Disponibilités »).
 *
 * Les horaires sont saisis en texte `HH:MM` plutôt qu'avec un sélecteur natif :
 * un sélecteur natif exige un module natif, donc une compilation de
 * développement (A5), pour sept couples de champs. Le pas de saisie est de 15
 * minutes, largement suffisant pour une plage de consultation.
 *
 * Pure : props entrantes, six événements sortants.
 */

type Props = {
  weekday: WeekdayIndex;
  day: WorkingDay | null;
  onToggle: (weekday: WeekdayIndex) => void;
  onChangeStart: (weekday: WeekdayIndex, minutes: number) => void;
  onChangeEnd: (weekday: WeekdayIndex, minutes: number) => void;
  onAddBreak: (weekday: WeekdayIndex) => void;
  onChangeBreak: (
    weekday: WeekdayIndex,
    index: number,
    startMinutes: number,
    endMinutes: number,
  ) => void;
  onRemoveBreak: (weekday: WeekdayIndex, index: number) => void;
  /** Message de vigilance pour ce jour, `null` si tout est cohérent. */
  problem?: string | null;
};

export function WorkingDayEditor({
  weekday,
  day,
  onToggle,
  onChangeStart,
  onChangeEnd,
  onAddBreak,
  onChangeBreak,
  onRemoveBreak,
  problem = null,
}: Props) {
  const open = day !== null;
  const invalid = problem !== null;

  return (
    <View style={[styles.card, invalid && styles.cardInvalid]}>
      <View style={styles.header}>
        <Text style={[styles.name, !open && styles.nameClosed]}>{WEEKDAYS[weekday]}</Text>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: open }}
          accessibilityLabel={`${WEEKDAYS[weekday]} ${open ? 'ouvert' : 'fermé'}`}
          onPress={() => onToggle(weekday)}
          style={({ pressed }) => [
            styles.switch,
            open ? styles.switchOn : styles.switchOff,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.switchText, open ? styles.switchTextOn : styles.switchTextOff]}>
            {open ? 'Ouvert' : 'Fermé'}
          </Text>
        </Pressable>
      </View>

      {open && day ? (
        <View style={styles.body}>
          <View style={styles.hours}>
            <TimeField
              label={`Début de la journée du ${WEEKDAYS[weekday]}`}
              caption="Début"
              value={day.startMinutes}
              onChange={(minutes) => onChangeStart(weekday, minutes)}
            />
            <Feather name="arrow-right" size={14} color={Brand.colors.textMuted} />
            <TimeField
              label={`Fin de la journée du ${WEEKDAYS[weekday]}`}
              caption="Fin"
              value={day.endMinutes}
              onChange={(minutes) => onChangeEnd(weekday, minutes)}
            />
          </View>

          {day.breaks.map((pause, index) => (
            <View key={`${weekday}-${index}`} style={styles.breakRow}>
              <Feather name="coffee" size={13} color={Brand.colors.textMuted} />

              <TimeField
                label={`Pause ${index + 1} de ${WEEKDAYS[weekday]}`}
                value={pause.startMinutes}
                onChange={(minutes) => onChangeBreak(weekday, index, minutes, pause.endMinutes)}
              />

              <Feather name="arrow-right" size={12} color={Brand.colors.textMuted} />

              <TimeField
                label={`Fin de la pause ${index + 1} de ${WEEKDAYS[weekday]}`}
                value={pause.endMinutes}
                onChange={(minutes) => onChangeBreak(weekday, index, pause.startMinutes, minutes)}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Supprimer la pause ${index + 1} du ${WEEKDAYS[weekday]}`}
                onPress={() => onRemoveBreak(weekday, index)}
                hitSlop={8}
              >
                <Feather name="trash-2" size={15} color={Brand.colors.danger} />
              </Pressable>
            </View>
          ))}

          <Button
            label="Ajouter une pause"
            variant="outline"
            icon="plus"
            block={false}
            onPress={() => onAddBreak(weekday)}
          />

          {invalid ? <Text style={styles.problem}>{problem}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Champ d'horaire `HH:MM`.
 *
 * `accessibilityLabel` sert aussi de libellé visible quand il est fourni : les
 * deux champs d'une ligne de pause se distinguent ainsi sans ajouter de texte.
 */
function TimeField({
  label,
  caption,
  value,
  onChange,
}: {
  label: string;
  /** Libellé visible au-dessus du champ, omis quand la ligne se suffit. */
  caption?: string;
  value: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <View style={styles.field}>
      {caption ? <Text style={styles.fieldLabel}>{caption}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        value={minutesToLabel(value)}
        onChangeText={(text) => {
          // La saisie est tolérante : on n'écrit dans l'état que si le texte
          // est une heure valide, sinon le champ resterait figé sous les doigts.
          const parsed = labelToMinutes(text);
          if (parsed !== null) onChange(parsed);
        }}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        placeholder="09:00"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    padding: Brand.spacing.md,
    gap: Brand.spacing.md,
  },
  cardInvalid: { borderColor: Brand.colors.danger },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...Typography.h3, color: Brand.colors.primaryDark },
  nameClosed: { color: Brand.colors.textMuted },

  switch: {
    paddingHorizontal: Brand.spacing.md,
    paddingVertical: Brand.spacing.sm,
    borderRadius: Brand.radius.pill,
    borderWidth: 1,
  },
  switchOn: { backgroundColor: Brand.colors.primary, borderColor: Brand.colors.primary },
  switchOff: { backgroundColor: Brand.colors.background, borderColor: Brand.colors.border },
  switchText: { ...Typography.xs },
  switchTextOn: { color: Brand.colors.onPrimary },
  switchTextOff: { color: Brand.colors.textMuted },
  pressed: { opacity: 0.85 },

  body: { gap: Brand.spacing.sm },
  hours: { flexDirection: 'row', alignItems: 'flex-end', gap: Brand.spacing.sm },
  field: { flex: 1, gap: 2 },
  fieldLabel: { ...Typography.xs, color: Brand.colors.textMuted },
  input: {
    ...Typography.bodyStrong,
    color: Brand.colors.text,
    backgroundColor: Brand.colors.background,
    borderRadius: Brand.radius.sm,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    paddingHorizontal: Brand.spacing.md,
    paddingVertical: Brand.spacing.sm,
    textAlign: 'center',
  },

  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.sm,
    backgroundColor: Brand.colors.background,
    borderRadius: Brand.radius.sm,
    paddingHorizontal: Brand.spacing.md,
    paddingVertical: Brand.spacing.sm,
  },

  problem: { ...Typography.xs, color: Brand.colors.danger },
});
