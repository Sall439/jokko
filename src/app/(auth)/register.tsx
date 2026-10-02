import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Brand, Typography } from '@/constants/brand';
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout';
import { useAuthForm } from '@/features/auth/useAuthForm';
import { normalizePhone } from '@/features/auth/validation';

/**
 * Écran d'inscription (Phase 3).
 *
 * L'inscription publique crée uniquement un PATIENT (A2) : aucun choix de rôle
 * n'est proposé, le service en crée un `patient` sans possibility de faire
 * autre chose. Les comptes praticiens sont créés par le cabinet.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const { values, errors, formError, loading, set, submit } = useAuthForm('register');

  return (
    <AuthScreenLayout
      title="Créer un compte patient"
      subtitle="Les comptes praticiens sont créés par le cabinet depuis son espace web."
    >
      <View style={styles.form}>
        <View style={styles.pair}>
          <View style={styles.half}>
            <TextField
              label="Prénom"
              icon="user"
              value={values.firstName}
              onChangeText={set('firstName')}
              error={errors.firstName}
              autoComplete="given-name"
              textContentType="givenName"
            />
          </View>
          <View style={styles.half}>
            <TextField
              label="Nom"
              value={values.lastName}
              onChangeText={set('lastName')}
              error={errors.lastName}
              autoComplete="family-name"
              textContentType="familyName"
            />
          </View>
        </View>

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
          label="Téléphone"
          icon="phone"
          value={values.phone}
          onChangeText={(text) => set('phone')(normalizePhone(text))}
          error={errors.phone}
          placeholder="+221 77 000 00 00"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />

        <TextField
          label="Mot de passe"
          icon="lock"
          secure
          value={values.password}
          onChangeText={set('password')}
          error={errors.password}
          placeholder="8 caractères minimum"
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <TextField
          label="Confirmer le mot de passe"
          icon="lock"
          secure
          value={values.confirmPassword}
          onChangeText={set('confirmPassword')}
          error={errors.confirmPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />

        {formError ? (
          <Text style={styles.formError} accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}

        <Button label="Créer mon compte" onPress={() => void submit()} loading={loading} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Vous avez déjà un compte&nbsp;?</Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace('/(auth)/login')}
          style={({ pressed }) => [styles.footerLinkWrap, pressed && styles.pressed]}
        >
          <Text style={styles.footerLink}>Se connecter</Text>
        </Pressable>
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: Brand.spacing.lg },
  pair: { flexDirection: 'row', gap: Brand.spacing.md },
  half: { flex: 1 },
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
