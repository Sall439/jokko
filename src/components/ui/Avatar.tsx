import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Brand, Typography } from '@/constants/brand';

type Props = Omit<ViewProps, 'style'> & {
  /** Initiales déjà calculées, ex. « MD ». */
  initials: string;
  /** Taille du disque : `sm` dans une liste, `md` dans un bandeau. */
  size?: 'sm' | 'md' | 'lg';
  /** Variante `soft` (fond primarySoft) ou `solid` (fond primary, texte blanc). */
  tone?: 'soft' | 'solid';
};

const SIZES = { sm: 32, md: 44, lg: 64 } as const;

/**
 * Avatar par initiales (A4). Aucune photo n'est nécessaire : le cahier des
 * charges ne fournit pas de visuels et le modèle montre des initiales.
 */
export function Avatar({ initials, size = 'md', tone = 'soft', ...viewProps }: Props) {
  const dimension = SIZES[size];

  return (
    <View
      {...viewProps}
      accessibilityRole="text"
      accessibilityLabel={initials}
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: tone === 'soft' ? Brand.colors.primarySoft : Brand.colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          tone === 'soft' ? styles.textSoft : styles.textSolid,
          { fontSize: Math.round(dimension * 0.36) },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { ...Typography.bodyStrong, includeFontPadding: false },
  textSoft: { color: Brand.colors.primaryDark },
  textSolid: { color: Brand.colors.onPrimary },
});
