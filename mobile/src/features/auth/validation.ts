/**
 * Validation des formulaires d'authentification (A6.6).
 * Fonctions pures : aucun état, aucun accès réseau. Les messages sont en
 * français, avec vouvoiement, et s'affichent sous le champ concerné.
 */

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Accepte `+221 77 452 89 10`, `774528910`, `77 452 89 10`. */
const PHONE_REGEX = /^\+?[0-9][0-9\s]{8,17}$/;
const MIN_PASSWORD_LENGTH = 8;

export type LoginField = 'email' | 'password';
export type RegisterField =
  'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirmPassword';

/** Retire les espaces d'un numéro pour la comparaison et l'affichage. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.-]/g, '');
}

export function validateLogin(values: Record<LoginField, string>): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {};

  if (!values.email.trim()) {
    errors.email = 'Saisissez votre adresse email.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Cette adresse email n'est pas valide.";
  }

  if (!values.password) {
    errors.password = 'Saisissez votre mot de passe.';
  }

  return errors;
}

export function validateRegister(
  values: Record<RegisterField, string>,
): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'Saisissez votre prénom.';
  }
  if (!values.lastName.trim()) {
    errors.lastName = 'Saisissez votre nom.';
  }

  if (!values.email.trim()) {
    errors.email = 'Saisissez votre adresse email.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Cette adresse email n'est pas valide.";
  }

  const phone = normalizePhone(values.phone);
  if (!phone) {
    errors.phone = 'Saisissez votre numéro de téléphone.';
  } else if (!PHONE_REGEX.test(phone)) {
    errors.phone = "Ce numéro n'est pas valide. Exemple : +221 77 000 00 00.";
  }

  if (!values.password) {
    errors.password = 'Choisissez un mot de passe.';
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Votre mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirmez votre mot de passe.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Les deux mots de passe ne sont pas identiques.';
  }

  return errors;
}

/** `true` si au moins un champ est en erreur. */
export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
