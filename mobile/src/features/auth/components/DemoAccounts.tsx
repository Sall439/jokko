import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
// Aide au développement uniquement : à supprimer quand l'API réelle sera branchée.
import { DEMO_ACCOUNTS } from '@/services/auth/auth.service.mock';
import { ROLE_LABEL } from '@/utils/roles';

type Props = { onSelect: (email: string, password: string) => void };

/**
 * Comptes de démonstration (A6.7). Visible uniquement en développement.
 * Un appui remplit le formulaire de connexion ; il ne connecte pas
 * directement, pour que le mot de passe soit réellement saisi par l'utilisateur.
 */
export function DemoAccounts({ onSelect }: Props) {
  if (!__DEV__) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Comptes de démonstration</Text>
      <Text style={styles.hint}>Touchez un compte pour remplir le formulaire.</Text>
      {DEMO_ACCOUNTS.map((account) => (
        <Pressable
          key={account.email}
          accessibilityRole="button"
          accessibilityLabel={`Remplir le formulaire avec le compte ${account.label}`}
          onPress={() => onSelect(account.email, account.password)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.role}>{ROLE_LABEL[account.role]}</Text>
            <Text style={styles.label} numberOfLines={1}>
              {account.email}
            </Text>
          </View>
          <Text style={styles.password}>{account.password}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: Brand.colors.primarySoft,
    borderRadius: Brand.radius.md,
    padding: Brand.spacing.lg,
    gap: Brand.spacing.sm,
  },
  title: { ...Typography.smStrong, color: Brand.colors.primaryDark },
  hint: { ...Typography.xs, color: Brand.colors.textMuted },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Brand.spacing.md,
    minHeight: Brand.controlHeight,
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.sm,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    paddingHorizontal: Brand.spacing.md,
    paddingVertical: Brand.spacing.sm,
  },
  pressed: { opacity: 0.7 },
  rowText: { flex: 1, gap: 2 },
  role: { ...Typography.xs, color: Brand.colors.primary },
  label: { ...Typography.smStrong, color: Brand.colors.text },
  password: { ...Typography.xs, color: Brand.colors.textMuted },
});
