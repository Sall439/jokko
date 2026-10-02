import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ServiceCard } from '@/components/domain/ServiceCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { Notice } from '@/components/ui/Notice';
import { Skeleton } from '@/components/ui/Skeleton';
import { Brand, Typography } from '@/constants/brand';
import { useCatalog } from '@/features/catalog/useCatalog';
import { SERVICE_CATEGORY_LABELS, type Service, type ServiceCategory } from '@/types/service';

/**
 * Onglet « Soins et tarifs » (A5) : catalogue du cabinet, tarifs en FCFA et
 * durées. « Réserver » renvoie vers le parcours avec le soin déjà choisi, pour
 * ne pas faire choisir deux fois un soin que le patient a déjà retenu.
 */

/** Onglet « Réserver » du même groupe de routes. */
const BOOK_ROUTE = '/(patient)/book';

/** Ordre d'affichage des catégories, du plus courant au plus urgent. */
const CATEGORY_ORDER: ServiceCategory[] = [
  'Prevention',
  'Soins',
  'Esthetique',
  'Chirurgie',
  'Urgence',
];

export default function ServicesScreen() {
  const { services, loading, error, reload } = useCatalog();

  if (loading) {
    return (
      <Screen>
        <Skeleton height={150} />
        <Skeleton height={150} />
        <Skeleton height={150} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState detail={error} onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Notice tone="info">
        Les tarifs sont indiqués en FCFA et le paiement se fait sur place. La durée affichée est
        celle prévue pour votre soin.
      </Notice>

      {CATEGORY_ORDER.map((category) => (
        <ServiceGroup
          key={category}
          category={category}
          services={services.filter((service) => service.category === category)}
        />
      ))}
    </Screen>
  );
}

function ServiceGroup({ category, services }: { category: ServiceCategory; services: Service[] }) {
  if (services.length === 0) return null;

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={styles.rule} />
        <Text style={styles.groupTitle}>{SERVICE_CATEGORY_LABELS[category]}</Text>
        <View style={styles.rule} />
      </View>

      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          actionLabel="Prendre ce soin"
          onSelect={(id) => router.push(`${BOOK_ROUTE}?serviceId=${id}`)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Brand.spacing.md, marginTop: Brand.spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.md },
  rule: { flex: 1, height: 1, backgroundColor: Brand.colors.border },
  groupTitle: { ...Typography.h3, color: Brand.colors.primaryDark },
});
