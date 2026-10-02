import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

export type ButtonVariant = 'primary' | 'outline' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Icône Feather affichée avant le libellé. */
  icon?: FeatherIconName;
  loading?: boolean;
  disabled?: boolean;
  /** Occupe toute la largeur du parent (défaut) ou taille son contenu. */
  block?: boolean;
  accessibilityLabel?: string;
};

/**
 * Bouton de la charte (A4). Pure : props entrantes, événement `onPress` sortant.
 * Rayon 8, zone tactile ≥ 48 px, trois variantes : primary, outline, danger.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  block = true,
  accessibilityLabel,
}: Props) {
  const inactive = disabled || loading;
  const spinnerColor =
    variant === 'primary' || variant === 'danger' ? Brand.colors.onPrimary : Brand.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        block && styles.block,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Feather
              name={icon}
              size={18}
              color={variant === 'outline' ? Brand.colors.primary : Brand.colors.onPrimary}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              variant === 'primary' && styles.labelOnPrimary,
              variant === 'danger' && styles.labelOnPrimary,
              variant === 'outline' && styles.labelOutline,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Brand.controlHeight,
    paddingHorizontal: Brand.spacing.xl,
    borderRadius: Brand.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { alignSelf: 'stretch' },
  primary: { backgroundColor: Brand.colors.primary },
  outline: {
    borderWidth: 2,
    borderColor: Brand.colors.primary,
    backgroundColor: Brand.colors.surface,
  },
  danger: { backgroundColor: Brand.colors.danger },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Brand.spacing.sm,
  },
  label: { ...Typography.bodyStrong, textAlign: 'center' },
  labelOnPrimary: { color: Brand.colors.onPrimary },
  labelOutline: { color: Brand.colors.primary },
});
