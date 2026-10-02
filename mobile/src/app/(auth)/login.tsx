import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Brand, Typography } from '@/constants/brand';
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout';
import { DemoAccounts } from '@/features/auth/components/DemoAccounts';
import { useAuthForm } from '@/features/auth/useAuthForm';

/**
 * Écran de connexion (Phase 3).
 *
 * Aucun choix de rôle ici : le rôle vient du compte (A2). Après `signIn`,
 * aucun `router.push` n'est effectué — la garde de navigation ouvre l'espace
 * correspondant au rôle renvoyé par le service (A6.3).
 */
export default function LoginScreen() {
  const router = useRouter();
  const { values, errors, formError, loading, set, fill, submit } = useAuthForm('login');

  return (
    <AuthScreenLayout
      title="Connexion"
      subtitle="Connectez-vous pour accéder à votre espace JokkoDentiste."
    >
      <View style={styles.form}>
        <TextField
          label="Adresse email"
          icon="mail"
          value={values.email}
          onChangeText={set('email')}
          error={errors.email}
          placeholder="votre@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <TextField
          label="Mot de passe"
          icon="lock"
          secure
          value={values.password}
          onChangeText={set('password')}
          error={errors.password}
          placeholder="Votre mot de passe"
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/(auth)/forgot-password')}
          style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
        >
          <Text style={styles.forgotText}>Mot de passe oublié&nbsp;?</Text>
        </Pressable>

        {formError ? (
          <Text style={styles.formError} accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}

        <Button label="Se connecter" onPress={() => void submit()} loading={loading} />
      </View>

      <DemoAccounts onSelect={(email, password) => fill({ email, password })} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Pas encore de compte&nbsp;?</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace('/(auth)/register')}
          style={({ pressed }) => [styles.footerLinkWrap, pressed && styles.pressed]}
        >
          <Text style={styles.footerLink}>Créer un compte</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: Brand.spacing.lg },
  forgot: {
    minHeight: Brand.hitTarget,
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  forgotText: { ...Typography.bodyStrong, color: Brand.colors.primary },
  pressed: { opacity: 0.7 },
  formError: {
    ...Typography.sm,
    color: Brand.colors.danger,
    backgroundColor: Brand.colors.overlays.dangerSoft,
    borderRadius: Brand.radius.sm,
    padding: Brand.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Brand.spacing.xs,
    paddingBottom: Brand.spacing.xl,
  },
  footerText: { ...Typography.body, color: Brand.colors.textMuted },
  footerLinkWrap: { minHeight: Brand.hitTarget, justifyContent: 'center' },
  footerLink: { ...Typography.bodyStrong, color: Brand.colors.primary },
});
