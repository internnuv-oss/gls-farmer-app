// 1. COLORS
export const colors = {
  // Core Brand Colors
  primary: '#2E7D32',       // Earthy Green
  primarySoft: '#E8F5E9',   // Very light green for active states/backgrounds
  secondary: '#F57C00',     // Warm Harvest Orange
  
  // Backgrounds & Surfaces
  screen: '#F9FAFB',        // Off-white/Light Gray for the main app background
  surface: '#FFFFFF',       // Pure white for cards, inputs, bottom sheets
  
  // Text & Borders
  text: '#1F2937',          // High contrast dark gray for primary text
  textMuted: '#6B7280',     // Muted gray for subtitles, placeholders, and helper text
  border: '#E5E7EB',        // Light gray for borders and dividers
  
  // Semantic Colors (Status, Alerts, Validation)
  success: '#16A34A',       // Green for success toasts/checks
  danger: '#DC2626',        // Red for errors and destructive actions
  warning: '#D97706',       // Amber for warnings/yellow flags
  info: '#2563EB',          // Blue for general information
};

// 2. SPACING (Based on an 8pt grid system)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

// 3. BORDER RADIUS
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999, // For perfectly round buttons or badges
};

// 4. SHADOWS (For elevation and depth)
export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3, // For Android
  },
  medium: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  }
};

// 5. TYPOGRAPHY (Standardized font sizing and weights)
export const typography = {
  headingXl: { fontSize: 30, fontWeight: '900' as const, letterSpacing: -0.5 },
  headingLg: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3 },
  headingMd: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '500' as const },
  bodyMd: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
};