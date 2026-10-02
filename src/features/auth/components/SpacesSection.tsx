import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

type Space = { icon: FeatherIconName; title: string; description: string };

const SPACES: Space[] = [
  {
    icon: 'smile',
    title: 'Espace patient',
    description: 'Réserver un soin, suivre vos rendez-vous et consulter les tarifs du cabinet.',
  },
  {
    icon: 'award',
    title: 'Espace praticien',
    description: 'Gérer votre agenda, valider les demandes et définir vos disponibilités.',
  },
];

/** Les deux espaces de l'application (Phase 3) : patient et praticien. */
export function SpacesSection() {
  return (
    <View style={styles.spaces}>
      {SPACES.map((space) => (
        <View key={space.title} style={styles.space}>
          <View style={styles.icon}>
            <Feather name={space.icon} size={20} color={Brand.colors.primary} />
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>{space.title}</Text>
            <Text style={styles.description}>{space.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spaces: { gap: Brand.spacing.md },
  space: {
    flexDirection: 'row',
    gap: Brand.spacing.md,
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    padding: Brand.spacing.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { ...Typography.h3, fontSize: Brand.fontSize.body, color: Brand.colors.primaryDark },
  description: { ...Typography.sm, color: Brand.colors.textMuted },
});
