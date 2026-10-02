import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Brand, Typography } from '@/constants/brand';
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout';
import { hasErrors } from '@/features/auth/validation';
import type { FieldErrors } from '@/features/auth/validation';

type Field = 'email' | 'code' | 'password';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

function validate(values: Record<Field, string>): FieldErrors<Field> {
  const errors: FieldErrors<Field> = {};

  if (!values.email.trim()) {
    errors.email = 'Saisissez votre adresse email.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Cette adresse email n'est pas valide.";
  }

  if (!values.code.trim()) {
    errors.code = 'Saisissez le code reçu par SMS.';
  }

  if (!values.password) {
    errors.password = 'Choisissez un nouveau mot de passe.';
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Votre mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }

  return errors;
}

/**
 * Réinitialisation du mot de passe (Phase 3).
 *
 * Interface complète et validée en français, avec de vrais `TextInput`
 * (A6.6), mais **service non branché** : le cahier des charges demande ici une
 * « interface seule, service prévu ». L'envoi du SMS et la vérification du
 * code arrivent avec l'API (Phase 7) ; en attendant, l'écran affiche un message
 * explicite plutôt que de laisser croire à un envoi effectif.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    email: '',
    code: '',
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const set = (field: Field) => (text: string) => {
    setValues((prev) => ({ ...prev, [field]: text }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    setNotice(null);
  };

  const handleSubmit = () => {
    const found = validate(values);
    setErrors(found);
    setNotice(null);
    if (hasErrors(found)) return;

    setNotice(
      "La réinitialisation par SMS n'est pas encore disponible. Contactez le cabinet pour modifier votre mot de passe.",
    );
  };

  return (
    <AuthScreenLayout
      title="Mot de passe oublié"
      subtitle="Indiquez votre email, puis le code reçu et votre nouveau mot de passe."
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
        />

        <TextField
          label="Code de vérification"
          icon="hash"
          value={values.code}
          onChangeText={set('code')}
          error={errors.code}
          placeholder="Code reçu par SMS"
          keyboardType="number-pad"
        />

        <TextField
          label="Nouveau mot de passe"
          icon="lock"
          secure
          value={values.password}
          onChangeText={set('password')}
          error={errors.password}
          placeholder="8 caractères minimum"
          autoCapitalize="none"
          autoComplete="new-password"
        />

        {notice ? (
          <Text style={styles.notice} accessibilityRole="alert">
            {notice}
          </Text>
        ) : null}

        <Button label="Réinitialiser le mot de passe" onPress={handleSubmit} />
        <Button
          label="Revenir à la connexion"
          variant="outline"
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: Brand.spacing.lg },
  notice: {
    ...Typography.sm,
    color: Brand.colors.primaryDark,
    backgroundColor: Brand.colors.primarySoft,
    borderRadius: Brand.radius.sm,
    padding: Brand.spacing.md,
  },
});
