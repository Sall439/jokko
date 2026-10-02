import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Brand, Typography } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

type Props = {
  title: string;
  /** Explication rassurante : pourquoi c'est vide et quoi faire ensuite. */
  description?: string;
  icon?: FeatherIconName;
  /** Libellé de l'action de sortie. Masque le bouton si absent. */
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * État vide : rien à afficher pour le moment, avec une sortie possible.
 * Pure : props entrantes, `onAction` sortant.
 */
export function EmptyState({ title, description, icon = 'inbox', actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={24} color={Brand.colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="outline" block={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Brand.spacing.md,
    paddingVertical: Brand.spacing.xxl,
    paddingHorizontal: Brand.spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.h3, color: Brand.colors.primaryDark, textAlign: 'center' },
  description: {
    ...Typography.sm,
    color: Brand.colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
});
