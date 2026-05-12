/**
 * Central styling tokens for the CRM frontend.
 *
 * - Typography: use `typography.*` with `cn()` from `utils/helpers` so pages stay consistent.
 * - `fontSans` must stay in sync with the Google Fonts import in `src/index.css` (Inter).
 * - Tailwind `theme.extend.fontFamily.sans` imports `fontSans` from this file.
 */

/** Stack passed to Tailwind — keep Inter first to match `@import` in index.css */
export const fontSans = [
  'Inter',
  'system-ui',
  '-apple-system',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
];

/** For inline `style={{ fontFamily }}` if ever needed */
export const fontSansCss = fontSans.join(', ');

/**
 * Tailwind class bundles (always include `font-sans` so pages don’t inherit random fonts).
 */
export const typography = {
  pageTitle: 'font-sans text-xl font-bold tracking-tight text-gray-900 sm:text-2xl',
  pageSubtitle: 'font-sans mt-1 text-sm font-normal leading-normal text-gray-500',
  sectionTitle: 'font-sans text-base font-semibold tracking-tight text-gray-900',
  cardTitle: 'font-sans text-sm font-semibold text-gray-900',
  body: 'font-sans text-sm font-normal leading-normal text-gray-900',
  bodyMuted: 'font-sans text-sm font-normal leading-normal text-gray-500',
  bodySmall: 'font-sans text-xs font-normal leading-snug text-gray-600',
  caption: 'font-sans text-xs font-normal leading-snug text-gray-500',
  label: 'font-sans text-xs font-semibold uppercase tracking-wide text-gray-500',
  labelDense: 'font-sans text-[11px] font-semibold uppercase tracking-wide text-gray-500',
  micro: 'font-sans text-[10px] font-medium leading-tight text-gray-500',
  tableHeader: 'font-sans text-xs font-semibold uppercase tracking-wider text-gray-500',
  navItem: 'font-sans text-sm font-medium',
  navGroupLabel: 'font-sans text-xs font-semibold uppercase tracking-wider text-gray-500',
};

/** Layout / surface helpers (optional `cn(surfaces.page, className)`) */
export const surfaces = {
  page: 'min-h-screen bg-slate-50 font-sans text-gray-900',
  appShell: 'min-h-screen bg-slate-50 font-sans text-gray-900',
};
