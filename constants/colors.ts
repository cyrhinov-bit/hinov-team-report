// HINOV Group Official Color Palette & Tokens
export const COLORS = {
  // Brand Principal
  primary: '#0B2240',        // Bleu Nuit Corporate HINOV
  primaryLight: '#163860',   // Bleu nuit plus clair
  primaryDark: '#07162C',    // Bleu nuit très profond
  primaryAccent: '#0066CC',  // Bleu interactif / CTA / Liens

  // Statuts & Indicateurs
  success: '#10B981',        // Vert validation / Rapport envoyé / Tâche terminée
  successLight: '#ECFDF5',   // Vert clair fond
  warning: '#F59E0B',        // Orange / Ambre alerte / Incomplet / Brouillon
  warningLight: '#FEF3C7',   // Orange clair fond
  danger: '#EF4444',         // Rouge alerte / Compte inactif / Erreur
  dangerLight: '#FEE2E2',    // Rouge clair fond
  info: '#3B82F6',           // Bleu info
  infoLight: '#EFF6FF',      // Bleu info clair fond

  // Intelligence Artificielle (Gemini AI)
  ai: '#8B5CF6',             // Violet / Magenta Gemini AI
  aiLight: '#F5F3FF',        // Violet très clair fond
  aiBorder: '#DDD6FE',       // Violet bordure
  aiAccent: '#D946EF',       // Magenta accent

  // Fond et Surfaces
  background: '#F8FAFC',     // Fond global ultra-moderne (Slate 50)
  surface: '#FFFFFF',        // Blanc cartes et conteneurs
  surfaceSubtle: '#F1F5F9',  // Gris neutre très doux (Slate 100)
  surfaceMuted: '#E2E8F0',   // Gris séparateur (Slate 200)

  // Typographie & Lisibilité
  textPrimary: '#0F172A',    // Texte principal haute lisibilité (Slate 900)
  textSecondary: '#64748B',  // Sous-titres et métadonnées (Slate 500)
  textMuted: '#94A3B8',      // Placeholders et inactifs (Slate 400)
  textWhite: '#FFFFFF',      // Texte blanc sur surfaces sombres

  // Bordures
  border: '#E2E8F0',
  borderFocus: '#0066CC',
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
};

