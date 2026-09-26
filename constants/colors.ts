// HINOV Team Report (HTR) - Exact Jeweler-Master Template Color Tokens
export const COLORS = {
  // Brand & Header Jeweler Template Palette (Red Crimson to Dark Burgundy)
  primary: '#e12503',              // Jeweler Signature Crimson Red
  primaryDark: '#85060c',          // Jeweler Dark Burgundy (Header Gradient End)
  primaryLight: '#ad1e04',         // Jeweler Hover / Deep Crimson
  primaryAccent: '#03a9f4',        // Jeweler Material Sky Blue / Cyan (Actions, Icons, CTA)
  primaryAccentHover: '#0288d1',
  primaryHeaderBorder: '#c7290d',

  // Dark & Neutral Elements
  dark: '#303030',                 // Jeweler Charcoal / Dark Panels
  darkLight: '#343434',
  darkHover: '#2b2a2a',

  // Gold & Rating Accents
  gold: '#f8ac59',                 // Jeweler Warm Gold / Amber
  goldLight: '#FEF9E7',
  goldBorder: '#FAD7A0',

  // Status & Indicators (Jeweler Material theme)
  success: '#27AE60',              // Vert Émeraude / Rapport validé / Tâche terminée
  successLight: '#E8F8F0',         // Fond vert doux
  warning: '#f8ac59',              // Orange/Ambre Jeweler / En cours / Brouillon
  warningLight: '#FEF5E7',         // Fond orange doux
  danger: '#e12503',               // Rouge Jeweler alerte / Erreur / Inactif
  dangerLight: '#FDEDEC',          // Fond rouge doux
  info: '#03a9f4',                 // Bleu cyan info
  infoLight: '#E1F5FE',            // Fond bleu cyan doux

  // Google Gemini AI Theme
  ai: '#9b59b6',                   // Violet Jeweler Multi-stripe
  aiLight: '#F4ECF7',              // Violet fond clair
  aiBorder: '#D2B4DE',             // Violet bordure
  aiAccent: '#8e44ad',

  // Backgrounds & Surfaces
  background: '#f5f5f5',           // Fond global standard Jeweler (#f5f5f5)
  surface: '#FFFFFF',              // Blanc pur cartes et conteneurs
  surfaceSubtle: '#F7F9FA',        // Gris très clair (#f7f9fa)
  surfaceMuted: '#E5E6E7',         // Gris bordure (#e5e6e7)

  // Typography & Readability
  textPrimary: '#303030',          // Texte principal foncé Jeweler
  textSecondary: '#676a6c',        // Sous-titres et descriptions (#676a6c)
  textMuted: '#999999',            // Placeholders et inactifs (#999999)
  textWhite: '#FFFFFF',            // Blanc

  // Borders & Controls
  border: '#E5E6E7',               // Bordure standard Jeweler (#e5e6e7)
  borderFocus: '#e12503',          // Bordure active Jeweler (#e12503)

  // Color-Line Multi-Stripe Gradient Palette
  stripeColors: [
    '#34495e',
    '#9b59b6',
    '#3498db',
    '#62cb31',
    '#ffb606',
    '#e67e22',
    '#e74c3c',
    '#c0392b',
  ],
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
};
