import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type ViewProps } from 'react-native';

import { Brand } from '@/constants/brand';

type Props = Omit<ViewProps, 'style'> & {
  width?: number | `${number}%`;
  height?: number;
  /** Arrondit les coins (défaut) ou dessine un disque (avatar). */
  rounded?: boolean;
  /** Forme de base, pour variesr la hauteur d'une pile de squelettes. */
  variant?: 'text' | 'block';
};

/**
 * Rectangle de chargement. L'opacité pulse via l'API `Animated` de React
 * Native : A5 interdit Reanimated/worklets pour de simples apparitions
 * (source de crashs dans Expo Go).
 *
 * Pure : aucune logique de données. `width` en pourcentage reste à éviter sur
 * Android pour un texte — préférer des lignes de largeur fixe.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = true,
  variant = 'text',
  ...viewProps
}: Props) {
  // `Animated.Value` doit être créé une seule fois par composant : il est
  // conservé dans un état lazy pour ne pas être instancié à chaque rendu.
  const [pulse] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      {...viewProps}
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement en cours"
      style={[
        { opacity: pulse, backgroundColor: Brand.colors.border },
        rounded && { borderRadius: height / 2 },
        variant === 'block' && styles.block,
        { width, height },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: Brand.radius.md },
});
