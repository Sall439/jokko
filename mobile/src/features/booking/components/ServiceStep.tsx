import { StyleSheet, View } from 'react-native';

import { ServiceCard } from '@/components/domain/ServiceCard';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Brand } from '@/constants/brand';
import type { Service } from '@/types/service';

type Props = {
  services: Service[];
  /** Identifiant du soin retenu, `null` tant que rien n'est choisi. */
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * Étape 2 du parcours : choix du soin.
 *
 * Chaque carte affiche la durée, qui détermine la fin du rendez-vous (A8.3) et
 * la place qu'un créneau doit laisser libre. Pure : props entrantes, `onSelect`
 * sortant.
 */
export function ServiceStep({ services, selectedId, onSelect }: Props) {
  return (
    <View style={styles.section}>
      <SectionTitle icon="activity">Quel soin&nbsp;?</SectionTitle>

      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          selected={service.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Brand.spacing.md },
});
