import { StyleSheet, View } from 'react-native';

import { DentistCard } from '@/components/domain/DentistCard';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Brand } from '@/constants/brand';
import type { Dentist } from '@/types/dentist';

type Props = {
  dentists: Dentist[];
  /** Identifiant du praticien retenu, `null` tant que rien n'est choisi. */
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * Étape 1 du parcours : choix du praticien.
 *
 * Le dentiste est demandé en premier parce que ses disponibilités déterminent
 * les dates proposables ; le choix du soin vient ensuite, sa durée changeant
 * les créneaux. Pure : props entrantes, `onSelect` sortant.
 */
export function DentistStep({ dentists, selectedId, onSelect }: Props) {
  return (
    <View style={styles.section}>
      <SectionTitle icon="user">Qui souhaitez-vous consulter&nbsp;?</SectionTitle>

      {dentists.map((dentist) => (
        <DentistCard
          key={dentist.id}
          dentist={dentist}
          selected={dentist.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Brand.spacing.md },
});
