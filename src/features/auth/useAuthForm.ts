import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import {
  hasErrors,
  validateLogin,
  validateRegister,
  type FieldErrors,
  type LoginField,
  type RegisterField,
} from '@/features/auth/validation';

/** Union des champs des deux formulaires : un seul état, deux contenus initiaux. */
type AuthFormField = LoginField | RegisterField;
type AuthFormValues = Record<AuthFormField, string>;
type AuthFormErrors = FieldErrors<AuthFormField>;

export const LOGIN_EMPTY: AuthFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export const REGISTER_EMPTY: AuthFormValues = LOGIN_EMPTY;

/**
 * Logique commune aux formulaires de connexion et d'inscription (A6.6) :
 * valeurs, erreurs par champ, message d'erreur global, état de chargement.
 *
 * Le formulaire ne fait aucun `router.push` : après `signIn` / `signUp`, la
 * redirection vers l'espace du rôle est faite par la garde de navigation
 * (`src/app/_layout.tsx`), seule source de redirection (A6.3).
 *
 * `mode` choisit le service appelé et la validation : pas de comparaison de
 * fonctions, pas d'`any`.
 */
export function useAuthForm(mode: 'login' | 'register') {
  const { signIn, signUp } = useAuth();
  const isRegister = mode === 'register';

  const [values, setValues] = useState<AuthFormValues>(isRegister ? REGISTER_EMPTY : LOGIN_EMPTY);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = useCallback(
    (field: AuthFormField) => (text: string) => {
      setValues((prev) => ({ ...prev, [field]: text }));
      // L'erreur du champ disparaît dès la saisie, pas seulement à la validation.
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
      setFormError(null);
    },
    [],
  );

  /** Remplit le formulaire : comptes de démonstration, préremplissage. */
  const fill = useCallback((next: Partial<AuthFormValues>) => {
    setValues((prev) => ({ ...prev, ...next }));
    setErrors({});
    setFormError(null);
  }, []);

  const submit = useCallback(async () => {
    if (isRegister) {
      const found = validateRegister(values as Record<RegisterField, string>);
      setErrors(found);
      setFormError(null);
      if (hasErrors(found)) return;

      setLoading(true);
      try {
        await signUp({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          password: values.password,
        });
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez.',
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const found = validateLogin(values as Record<LoginField, string>);
    setErrors(found);
    setFormError(null);
    if (hasErrors(found)) return;

    setLoading(true);
    try {
      await signIn({ email: values.email, password: values.password });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [isRegister, signIn, signUp, values]);

  return useMemo(
    () => ({ values, errors, formError, loading, set, fill, submit }),
    [values, errors, formError, loading, set, fill, submit],
  );
}
