import {
  hasErrors,
  normalizePhone,
  validateLogin,
  validateRegister,
} from '@/features/auth/validation';

/** Validation des formulaires d'authentification (A6.6). */

describe('validateLogin', () => {
  it('accepte un email et un mot de passe valides', () => {
    expect(validateLogin({ email: 'moussa.diop@jokkodent.sn', password: 'patient123' })).toEqual(
      {},
    );
  });

  it('refuse un champ vide', () => {
    const errors = validateLogin({ email: '', password: '' });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('refuse un email sans domaine', () => {
    expect(validateLogin({ email: 'moussa.diop', password: 'x' }).email).toBeDefined();
    expect(validateLogin({ email: 'moussa@', password: 'x' }).email).toBeDefined();
    expect(validateLogin({ email: '@jokkodent.sn', password: 'x' }).email).toBeDefined();
  });

  it('refuse une adresse email contenant un espace', () => {
    expect(validateLogin({ email: 'moussa diop@jokkodent.sn', password: 'x' }).email).toBeDefined();
  });

  it('accepte les espaces autour de l’email', () => {
    expect(validateLogin({ email: '  moussa.diop@jokkodent.sn  ', password: 'x' })).toEqual({});
  });

  it('n’exige pas de longueur minimale sur le mot de passe à la connexion', () => {
    // La longueur est vérifiée à l'inscription, pas à la connexion.
    expect(validateLogin({ email: 'a@b.sn', password: 'x' }).password).toBeUndefined();
  });
});

describe('validateRegister', () => {
  const valid = {
    firstName: 'Awa',
    lastName: 'Sow',
    email: 'awa.sow@example.sn',
    phone: '+221 77 000 00 00',
    password: 'motdepasse1',
    confirmPassword: 'motdepasse1',
  };

  it('accepte un dossier complet valide', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('refuse les champs texte vides', () => {
    const errors = validateRegister({ ...valid, firstName: '   ', lastName: '' });
    expect(errors.firstName).toBeDefined();
    expect(errors.lastName).toBeDefined();
  });

  it('refuse un mot de passe de moins de 8 caractères', () => {
    expect(
      validateRegister({ ...valid, password: 'court', confirmPassword: 'court' }).password,
    ).toContain('8');
  });

  it('refuse des mots de passe qui diffèrent', () => {
    const errors = validateRegister({ ...valid, confirmPassword: 'autremotdepasse' });
    expect(errors.confirmPassword).toBeDefined();
  });

  it('refuse une confirmation vide', () => {
    expect(validateRegister({ ...valid, confirmPassword: '' }).confirmPassword).toBeDefined();
  });

  it('accepte les numéros de téléphone sénégalais usuels', () => {
    for (const phone of ['+221 77 452 89 10', '774528910', '77 452 89 10', '+221774528910']) {
      expect(validateRegister({ ...valid, phone }).phone).toBeUndefined();
    }
  });

  it('refuse un numéro trop court', () => {
    expect(validateRegister({ ...valid, phone: '22177' }).phone).toBeDefined();
  });

  it('refuse un numéro contenant des lettres', () => {
    expect(validateRegister({ ...valid, phone: '+221 77 ABC 89 10' }).phone).toBeDefined();
  });

  it('signale toutes les erreurs en une passe', () => {
    const errors = validateRegister({
      firstName: '',
      lastName: '',
      email: 'invalide',
      phone: '1',
      password: 'a',
      confirmPassword: 'b',
    });
    expect(Object.keys(errors).sort()).toEqual([
      'confirmPassword',
      'email',
      'firstName',
      'lastName',
      'password',
      'phone',
    ]);
  });
});

describe('normalizePhone', () => {
  it('retire les espaces, points et tirets', () => {
    expect(normalizePhone('+221 77 452 89 10')).toBe('+221774528910');
    expect(normalizePhone('77.452-89 10')).toBe('774528910');
  });

  it('laisse un numéro déjà compact inchangé', () => {
    expect(normalizePhone('774528910')).toBe('774528910');
  });
});

describe('hasErrors', () => {
  it('détecte la présence d’au moins une erreur', () => {
    expect(hasErrors({ email: 'requis' })).toBe(true);
    expect(hasErrors({})).toBe(false);
  });
});
