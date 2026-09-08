/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#12213F',
    tint: '#1479C9',

    // Core surfaces
    background: '#F5F8FC',
    foreground: '#12213F',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#12213F',

    // Primary action color (buttons, links, active states)
    primary: '#1479C9',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EAF2FB',
    secondaryForeground: '#17365F',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EFF3F8',
    mutedForeground: '#71809A',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FBE9D3',
    accentForeground: '#A85B13',

    // Destructive actions (delete, error states)
    destructive: '#C93462',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DDE6F0',
    input: '#D1DCE9',

    success: '#20A66A',
    warning: '#E8911B',
    ai: '#B52EA4',
    navy: '#12213F',
    blueSoft: '#EAF4FF',
    greenSoft: '#E8F7EF',
    orangeSoft: '#FFF3E2',
    purpleSoft: '#F9EAF7',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
