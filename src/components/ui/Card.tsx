import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Brand } from '@/constants/brand';

type Props = Omit<ViewProps, 'style'> & {
  children: ReactNode;
  /** Rend la carte pressable (sélection, navigation). Exige `onPress`. */
  onPress?: () => void;
  /** Met en évidence une carte sélectionnée (créneau choisi, filtre actif). */
  selected?: boolean;
};

/**
 * Carte de la charte (A4) : fond `surface`, rayon 12, filet `border`.
 * Pure : props entrantes, événement `onPress` sortant optionnel.
 *
 * Les props de vue sont transmises dans les deux branches : une carte
 * pressable doit pouvoir recevoir un `accessibilityLabel` au même titre qu'une
 * carte simple.
 */
export function Card({ children, onPress, selected = false, ...viewProps }: Props) {
  const style = [styles.card, selected && styles.selected];

  if (!onPress) {
    return (
      <View {...viewProps} style={style}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      {...viewProps}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.md,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    padding: Brand.spacing.lg,
  },
  selected: {
    borderColor: Brand.colors.primary,
    borderWidth: 2,
    backgroundColor: Brand.colors.primarySoft,
  },
  pressed: { opacity: 0.85 },
});
