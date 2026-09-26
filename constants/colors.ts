// HINOV Team Report (HTR) - Jeweler-Master Design System Tokens
export const COLORS = {
  // Brand & Sidebar Jeweler Master Palette
  primary: '#152036',        // Deep Navy Jeweler Header & Sidebar
  primaryLight: '#1B2A47',   // Navy hover surface
  primaryDark: '#0D1524',    // Very deep dark background
  primaryAccent: '#006DF0',  // Jeweler Royal Blue (Actions, CTA, Active item)
  primaryAccentHover: '#005AC6',

  // Gold & Corporate Accents
  gold: '#E5A823',           // Jeweler Gold Badge / Accent
  goldLight: '#FEF9E7',
  goldBorder: '#FAD7A0',

  // Sidebar Specific Tokens
  sidebarBg: '#152036',
  sidebarHover: '#1B2A47',
  sidebarActive: '#006DF0',
  sidebarText: '#8A99B5',
  sidebarTextActive: '#FFFFFF',
  sidebarBorder: '#243452',

  // Status & Indicators
  success: '#27AE60',        // Vert validation / Rapport soumis / Tâche terminée
  successLight: '#EAFAF1',   // Vert clair fond
  warning: '#F39C12',        // Orange / Ambre alerte / En cours / Brouillon
  warningLight: '#FEF5E7',   // Orange clair fond
  danger: '#E74C3C',         // Rouge alerte / Compte inactif / Erreur
  dangerLight: '#FDEDEC',    // Rouge clair fond
  info: '#2980B9',           // Bleu info
  infoLight: '#EBF5FB',      // Bleu info clair fond

  // Gemini AI Theme
  ai: '#8E44AD',             // Violet IA
  aiLight: '#F4ECF7',        // Violet très clair fond
  aiBorder: '#D2B4DE',       // Violet bordure
  aiAccent: '#9B59B6',       // Magenta accent

  // Backgrounds & Surfaces
  background: '#F6F8FA',     // Fond global Jeweler Dashboard
  surface: '#FFFFFF',        // Blanc cartes et conteneurs
  surfaceSubtle: '#F0F3F6',  // Gris neutre très doux
  surfaceMuted: '#E5E9EC',   // Gris séparateur

  // Typography & Readability
  textPrimary: '#2B3445',    // Texte principal haute lisibilité
  textSecondary: '#6B7A90',  // Sous-titres et métadonnées
  textMuted: '#9AA7B9',      // Placeholders et inactifs
  textWhite: '#FFFFFF',      // Texte blanc sur surfaces sombres

  // Borders
  border: '#E5E9EC',
  borderFocus: '#006DF0',
};

export const SHADOWS = {
  sm: {
    shadowColor: '#152036',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#152036',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#152036',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};
