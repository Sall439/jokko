import { StyleSheet, Text, View } from 'react-native';

import { DateStrip } from '@/components/domain/DateStrip';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { SlotGrid } from '@/components/domain/SlotGrid';
import { Notice } from '@/components/ui/Notice';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Typography } from '@/constants/brand';
import type { Slot } from '@/utils/slots';
import { formatLongDate } from '@/utils/date';
import { capitalize } from '@/utils/text';

type Props = {
  days: Date[];
  selectedDateKey: string | null;
  onSelectDate: (key: string) => void;

  slots: Slot[];
  freeSlotCount: number;
  selectedStartMinutes: number | null;
  onSelectSlot: (startMinutes: number) => void;

  /** Durée du soin, affichée pour que le patient sache ce qu'elle bloque. */
  durationMinutes: number;
  loading: boolean;
};

/** Gabarits de chargement : des tailles fixes, pas des crochets. */
const STRIP_PLACEHOLDERS = [0, 1, 2, 3, 4];
const GRID_PLACEHOLDERS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Étape « Date et créneau » du parcours.
 *
 * Les heures déjà prises restent visibles et barrées : le patient voit que le
 * cabinet travaille ce jour-là, ce qui est plus rassurant qu'une grille
 * inexplicablement vide. Pure : props entrantes, deux événements sortants.
 */
export function SlotStep({
  days,
  selectedDateKey,
  onSelectDate,
  slots,
  freeSlotCount,
  selectedStartMinutes,
  onSelectSlot,
  durationMinutes,
  loading,
}: Props) {
  if (!loading && days.length === 0) {
    return (
      <Notice tone="warning" title="Aucune date disponible">
        {`Ce praticien n'a pas de créneau libre pour un soin de ${durationMinutes} minutes dans les prochaines semaines. Essayez un autre soin ou un autre praticien.`}
      </Notice>
    );
  }

  return (
    <View style={styles.section}>
      <View>
        <SectionTitle icon="calendar">Choisissez une date</SectionTitle>

        {loading ? (
          <View style={styles.strip}>
            {STRIP_PLACEHOLDERS.map((index) => (
              <Skeleton key={index} width={60} height={78} variant="block" />
            ))}
          </View>
        ) : (
          <DateStrip days={days} selectedKey={selectedDateKey} onSelect={onSelectDate} />
        )}
      </View>

      <View>
        <SectionTitle icon="clock">Heure disponible</SectionTitle>

        {loading ? (
          <View style={styles.grid}>
            {GRID_PLACEHOLDERS.map((index) => (
              <Skeleton key={index} width="31%" height={44} variant="block" />
            ))}
          </View>
        ) : (
          <>
            {selectedDateKey ? (
              <Text style={styles.dayLabel}>
                {capitalize(formatLongDate(new Date(selectedDateKey)))}
              </Text>
            ) : null}

            <SlotGrid
              slots={slots}
              selectedStartMinutes={selectedStartMinutes}
              onSelect={onSelectSlot}
            />

            <Text style={styles.legend}>
              {describeAvailability(freeSlotCount, durationMinutes)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/** Phrase de fin d'étape : combien de créneaux restent, et pour quelle durée. */
function describeAvailability(freeSlotCount: number, durationMinutes: number): string {
  if (freeSlotCount === 0) return `Aucun créneau libre pour ${durationMinutes} minutes.`;
  if (freeSlotCount === 1) return `1 créneau libre de ${durationMinutes} minutes.`;

  return `${freeSlotCount} créneaux libres de ${durationMinutes} minutes.`;
}

const styles = StyleSheet.create({
  section: { gap: Brand.spacing.xl },

  strip: { flexDirection: 'row', gap: Brand.spacing.sm, paddingVertical: Brand.spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Brand.spacing.sm },

  dayLabel: { ...Typography.h3, color: Brand.colors.primaryDark, marginBottom: Brand.spacing.md },
  legend: { ...Typography.xs, color: Brand.colors.textMuted },
});
