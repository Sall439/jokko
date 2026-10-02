/**
 * Charte graphique JokkoDentiste (cahier des charges, section A4).
 * Source unique des couleurs, typographies, rayons et espacements.
 * Interdit : toute couleur en dur hors de ce fichier.
 */

export const Brand = {
  colors: {
    primary: '#0A7E8A',
    primaryDark: '#08505B',
    primarySoft: '#E1F3F5',
    background: '#F4FAFB',
    surface: '#FFFFFF',
    text: '#12303A',
    textMuted: '#5B7580',
    success: '#2E9E6B',
    warning: '#E09A12',
    danger: '#D6404A',
    border: '#D5E5E8',
    onPrimary: '#FFFFFF',

    /**
     * Tokens dérivés : uniquement des variations d'opacité ou de teinte des
     * couleurs ci-dessus, pour ne jamais écrire une couleur en dur dans un
     * composant (A4). Rien de nouveau n'est introduit visuellement.
     */
    overlays: {
      /** Fond d'un message d'erreur. */
      dangerSoft: '#FBE9EA',
      /** Fond d'un avertissement (délai d'annulation, information importante). */
      warningSoft: '#FBF1DF',
      /** Fond d'un message rassurant (rendez-vous confirmé). */
      successSoft: '#E6F3ED',
      /** Texte secondaire sur fond primaryDark. */
      onPrimaryMuted: 'rgba(255,255,255,0.82)',
      /** Texte tertiaire sur fond primaryDark. */
      onPrimaryFaint: 'rgba(255,255,255,0.92)',
      /** Fond d'un bouton icône sur fond primaryDark. */
      onPrimaryChip: 'rgba(255,255,255,0.16)',
      /** Filet de séparation sur fond primaryDark. */
      onPrimaryHairline: 'rgba(255,255,255,0.20)',
    },
  },

  /** Poppins pour les titres, Inter pour le texte courant. */
  fonts: {
    heading: 'Poppins_600SemiBold',
    headingBold: 'Poppins_700Bold',
    body: 'Inter_400Regular',
    bodyMedium: 'Inter_500Medium',
    bodySemiBold: 'Inter_600SemiBold',
  },

  /** Tailles imposées : H1 32, H2 24, H3 18, texte 16, petits textes 13–14. */
  fontSize: {
    h1: 32,
    h2: 24,
    h3: 18,
    body: 16,
    sm: 14,
    xs: 13,
  },

  radius: { sm: 8, md: 12, lg: 20, pill: 999 },

  /** Espacements : multiples de 4. */
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },

  /**
   * Taille de zone tactile minimale (Phase 7, accessibilité).
   *
   * Aucun bouton, pastille ni créneau ne descend sous cette valeur : c'est le
   * seuil qui permet à un patient âgé d'appuyer juste, sans viser.
   */
  hitTarget: 44,

  /** Hauteur des boutons et des champs de saisie, un cran au-dessus du minimum. */
  controlHeight: 48,

  /** Règles métier visibles par le patient (B0). */
  rules: {
    arriveeAvanceMinutes: 10,
    annulationHeuresAvant: 24,
    devise: 'FCFA',
    fuseau: 'Africa/Dakar',
  },
} as const;

/**
 * Styles de texte prêts à l'emploi (A4) : Poppins pour les titres,
 * Inter pour le texte courant. Un composant écrit
 * `<Text style={[Typography.h3, { color: Brand.colors.text }]} />`
 * afin de toujours partir de la bonne fonte.
 *
 * `fontWeight` est volontairement absent : Poppins et Inter sont déjà
 * chargées dans le bon poids via `useBrandFonts`, il faut donc choisir la
 * famille et non la graisse.
 */
export const Typography = {
  h1: { fontFamily: Brand.fonts.headingBold, fontSize: Brand.fontSize.h1, lineHeight: 40 },
  h2: { fontFamily: Brand.fonts.heading, fontSize: Brand.fontSize.h2, lineHeight: 32 },
  h3: { fontFamily: Brand.fonts.heading, fontSize: Brand.fontSize.h3, lineHeight: 26 },
  body: { fontFamily: Brand.fonts.body, fontSize: Brand.fontSize.body, lineHeight: 24 },
  bodyMedium: { fontFamily: Brand.fonts.bodyMedium, fontSize: Brand.fontSize.body, lineHeight: 24 },
  bodyStrong: {
    fontFamily: Brand.fonts.bodySemiBold,
    fontSize: Brand.fontSize.body,
    lineHeight: 24,
  },
  sm: { fontFamily: Brand.fonts.body, fontSize: Brand.fontSize.sm, lineHeight: 20 },
  smStrong: { fontFamily: Brand.fonts.bodySemiBold, fontSize: Brand.fontSize.sm, lineHeight: 20 },
  xs: { fontFamily: Brand.fonts.body, fontSize: Brand.fontSize.xs, lineHeight: 18 },
  onPrimary: {
    fontFamily: Brand.fonts.bodySemiBold,
    fontSize: Brand.fontSize.sm,
    color: Brand.colors.onPrimary,
  },
} as const;

/** Couleur d'un badge de statut (règle A4). */
export const STATUS_COLORS = {
  en_attente: Brand.colors.warning,
  confirme: Brand.colors.success,
  annule: Brand.colors.danger,
  termine: Brand.colors.textMuted,
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

/** Libellés français des statuts, pour l'affichage. */
export const STATUS_LABELS: Record<StatusKey, string> = {
  en_attente: 'En attente',
  confirme: 'Confirmé',
  annule: 'Annulé',
  termine: 'Terminé',
};
