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
    text: '#F4F8FF',
    tint: '#69B7FF',

    // Core surfaces
    background: '#050B17',
    foreground: '#F4F8FF',

    // Cards / elevated surfaces
    card: '#0D1728',
    cardForeground: '#F4F8FF',

    // Primary action color (buttons, links, active states)
    primary: '#69B7FF',
    primaryForeground: '#06101F',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#14243A',
    secondaryForeground: '#DCEBFF',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#122036',
    mutedForeground: '#91A5BE',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#183454',
    accentForeground: '#CBE5FF',

    // Destructive actions (delete, error states)
    destructive: '#FF5B66',
    destructiveForeground: '#FFF5F5',

    // Borders and input outlines
    border: '#203653',
    input: '#294668',
    overlay: '#071225',
    overlayStrong: '#050B17',
    star: '#FFFFFF',
    starDim: '#BBD6F5',
    redNight: '#EC5365',
    success: '#76D6A1',
  },

  dark: {
    text: '#F4F8FF',
    tint: '#69B7FF',
    background: '#050B17',
    foreground: '#F4F8FF',
    card: '#0D1728',
    cardForeground: '#F4F8FF',
    primary: '#69B7FF',
    primaryForeground: '#06101F',
    secondary: '#14243A',
    secondaryForeground: '#DCEBFF',
    muted: '#122036',
    mutedForeground: '#91A5BE',
    accent: '#183454',
    accentForeground: '#CBE5FF',
    destructive: '#FF5B66',
    destructiveForeground: '#FFF5F5',
    border: '#203653',
    input: '#294668',
    overlay: '#071225',
    overlayStrong: '#050B17',
    star: '#FFFFFF',
    starDim: '#BBD6F5',
    redNight: '#EC5365',
    success: '#76D6A1',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
