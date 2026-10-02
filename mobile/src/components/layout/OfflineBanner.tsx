import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import { useIsOffline } from '@/features/network/useIsOffline';

/**
 * Bandeau « hors ligne » (Phase 7).
 *
 * Le cabinet peut être injoignable alors que le réseau fonctionne : ce bandeau ne
 * ment donc pas sur la cause. Il annonce seulement que l'affichage peut être
 * incomplet, et disparaît dès que la connexion revient.
 *
 * L'apparition utilise l'API `Animated` de React Native, pas Reanimated : A5
 * l'interdit pour de simples apparitions, pour cause de crashs dans Expo Go.
 */
export function OfflineBanner() {
  const isOffline = useIsOffline();
  // `Animated.Value` doit être instancié une seule fois : il est créé dans un
  // état paresseux, sinon chaque rendu repartirait d'une nouvelle valeur.
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isOffline ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOffline, opacity]);

  // Le bandeau n'existe que lorsqu'il a quelque chose à dire : le garder en place,
  // même transparent, laisserait une bande vide en haut de chaque écran.
  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <View
        style={styles.row}
        accessible
        accessibilityRole="alert"
        accessibilityLabel="Vous êtes hors ligne. Certaines informations peuvent ne pas être à jour."
      >
        <Feather name="wifi-off" size={16} color={Brand.colors.warning} />
        <Text style={styles.text} numberOfLines={2}>
          Vous êtes hors ligne. Certaines informations peuvent ne pas être à jour.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Brand.colors.overlays.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: Brand.colors.warning,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.sm,
    paddingHorizontal: Brand.spacing.lg,
    paddingVertical: Brand.spacing.md,
  },
  text: { ...Typography.xs, color: Brand.colors.text, flex: 1 },
});
