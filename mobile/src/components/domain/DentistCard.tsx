import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Brand, Typography } from '@/constants/brand';
import { getDentistInitials } from '@/types/dentist';
import type { Dentist } from '@/types/dentist';

type Props = {
  dentist: Dentist;
  selected: boolean;
  onSelect: (id: string) => void;
};

/**
 * Carte de sélection d'un praticien (A4) : initiales, nom d'usage,
 * spécialité et note. Pure : props entrantes, `onSelect` sortant.
 */
export function DentistCard({ dentist, selected, onSelect }: Props) {
  return (
    <Card selected={selected} onPress={() => onSelect(dentist.id)}>
      <View style={styles.row}>
        <Avatar initials={getDentistInitials(dentist)} tone={selected ? 'solid' : 'soft'} />

        <View style={styles.body}>
          <Text style={styles.name}>{`Dr. ${dentist.firstName} ${dentist.lastName}`}</Text>
          <Text style={styles.specialty}>{dentist.specialty}</Text>

          <View style={styles.rating}>
            <Feather name="star" size={13} color={Brand.colors.warning} />
            <Text style={styles.ratingText}>{dentist.rating.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        <Feather
          name={selected ? 'check-circle' : 'chevron-right'}
          size={20}
          color={selected ? Brand.colors.primary : Brand.colors.textMuted}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.md },
  body: { flex: 1, gap: 2 },
  name: { ...Typography.bodyStrong, color: Brand.colors.primaryDark },
  specialty: { ...Typography.sm, color: Brand.colors.textMuted },
  rating: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.xs, marginTop: 2 },
  ratingText: { ...Typography.xs, color: Brand.colors.text },
});
