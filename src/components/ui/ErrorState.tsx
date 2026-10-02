import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Brand, Typography } from '@/constants/brand';

type Props = {
  /** Message technique destiné au développeur, affiché en petit. */
  detail?: string;
  /** Message utilisateur. Par défaut, un texte rassurant et non technique. */
  title?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

/**
 * État d'erreur avec action « Réessayer » (A5).
 * Pure : props entrantes, `onRetry` sortant. Le message technique reste
 * séparé du message utilisateur, conformément au ton simple et rassurant.
 */
export function ErrorState({
  detail,
  title = 'Impossible de charger les informations.',
  onRetry,
  retrying = false,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="alert-triangle" size={24} color={Brand.colors.danger} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.description}>Vérifiez votre connexion internet puis réessayez.</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {onRetry ? (
        <Button
          label="Réessayer"
          icon="refresh-cw"
          onPress={onRetry}
          loading={retrying}
          block={false}
        />
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
    backgroundColor: Brand.colors.overlays.dangerSoft,
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
  detail: { ...Typography.xs, color: Brand.colors.textMuted, textAlign: 'center' },
});
