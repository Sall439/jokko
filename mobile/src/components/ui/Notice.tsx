import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

export type NoticeTone = 'info' | 'warning' | 'success' | 'danger';

type Props = {
  /** Une phrase rassurante, pas un code technique. */
  children: string;
  tone?: NoticeTone;
  /** Titre court facultatif, en gras au-dessus du texte. */
  title?: string;
  icon?: FeatherIconName;
};

const TONES: Record<
  NoticeTone,
  { background: string; foreground: string; border: string; icon: FeatherIconName }
> = {
  info: {
    background: Brand.colors.primarySoft,
    foreground: Brand.colors.primaryDark,
    border: Brand.colors.primary,
    icon: 'info',
  },
  warning: {
    background: Brand.colors.overlays.warningSoft,
    foreground: Brand.colors.text,
    border: Brand.colors.warning,
    icon: 'alert-triangle',
  },
  success: {
    background: Brand.colors.overlays.successSoft,
    foreground: Brand.colors.text,
    border: Brand.colors.success,
    icon: 'check-circle',
  },
  danger: {
    background: Brand.colors.overlays.dangerSoft,
    foreground: Brand.colors.text,
    border: Brand.colors.danger,
    icon: 'alert-triangle',
  },
};

/**
 * Encart d'information : règle du cabinet, avertissement d'annulation,
 * confirmation. Pure : props entrantes, pas d'événement.
 *
 * Le ton ne se choisit pas librement : chaque couleur vient de la charte, avec
 * un fond dérivé et un texte en `text` pour rester lisible (contraste AA).
 */
export function Notice({ children, tone = 'info', title, icon }: Props) {
  const palette = TONES[tone];

  return (
    <View
      accessibilityRole="text"
      style={[
        styles.container,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      <Feather name={icon ?? palette.icon} size={18} color={palette.foreground} />
      <View style={styles.body}>
        {title ? <Text style={[styles.title, { color: palette.foreground }]}>{title}</Text> : null}
        <Text style={styles.text}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Brand.spacing.md,
    borderRadius: Brand.radius.md,
    borderLeftWidth: 4,
    padding: Brand.spacing.lg,
  },
  body: { flex: 1, gap: 2 },
  title: { ...Typography.smStrong },
  text: { ...Typography.sm, color: Brand.colors.text },
});
