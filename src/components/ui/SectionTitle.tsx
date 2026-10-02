import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

type Props = {
  children: string;
  /** Icône à gauche du titre. */
  icon?: FeatherIconName;
  /** Texte d'appui à droite du titre (compteur, lien d'action). */
  trailing?: string;
};

/** Titre de section : Poppins, primaryDark, précédé d'une icône optionnelle. */
export function SectionTitle({ children, icon, trailing }: Props) {
  return (
    <View style={styles.row}>
      {icon ? <Feather name={icon} size={18} color={Brand.colors.primary} /> : null}
      <Text style={styles.title} accessibilityRole="header">
        {children}
      </Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.sm,
    marginBottom: Brand.spacing.xs,
  },
  title: { ...Typography.h3, color: Brand.colors.primaryDark, flex: 1 },
  trailing: { ...Typography.smStrong, color: Brand.colors.primary },
});
