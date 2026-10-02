import { StyleSheet, Text, Pressable, View, type ViewProps } from 'react-native';

import { Brand, Typography } from '@/constants/brand';

export type ChipTone = 'neutral' | 'primary';

type Props = Omit<ViewProps, 'style'> & {
  label: string;
  /** pastille de compteur à droite du libellé (ex. nombre de RDV en attente). */
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  tone?: ChipTone;
};

/**
 * Filtre en pilule pour les Chip/Tabs de filtres (A4) : « Tous / En attente /
 * Confirmés / Historique » côté patient, « Jour / Semaine » côté dentiste.
 * Pure : props entrantes, `onPress` sortant.
 */
export function Chip({
  label,
  count,
  selected = false,
  onPress,
  tone = 'neutral',
  ...viewProps
}: Props) {
  const activePrimary = selected && tone === 'primary';

  const content = (
    <>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {count !== undefined ? (
        <View style={[styles.count, selected && styles.countSelected]}>
          <Text style={[styles.countText, selected && styles.countTextSelected]}>{count}</Text>
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View {...viewProps} style={[styles.base, selected && styles.selected]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      {...viewProps}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        activePrimary && styles.selectedPrimary,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Brand.spacing.sm,
    minHeight: Brand.hitTarget,
    paddingHorizontal: Brand.spacing.lg,
    borderRadius: Brand.radius.pill,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    backgroundColor: Brand.colors.surface,
  },
  selected: { borderColor: Brand.colors.primary, backgroundColor: Brand.colors.primarySoft },
  selectedPrimary: { backgroundColor: Brand.colors.primary },
  pressed: { opacity: 0.85 },
  label: { ...Typography.smStrong, color: Brand.colors.text },
  labelSelected: { color: Brand.colors.primaryDark },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Brand.radius.pill,
    alignItems: 'center',
    backgroundColor: Brand.colors.primarySoft,
  },
  countSelected: { backgroundColor: Brand.colors.surface },
  countText: {
    ...Typography.xs,
    fontFamily: Brand.fonts.bodySemiBold,
    color: Brand.colors.primaryDark,
  },
  countTextSelected: { color: Brand.colors.primaryDark },
});
