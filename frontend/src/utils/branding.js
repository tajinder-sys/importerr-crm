const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const SUBHEADING_SIZES = ['xs', 'sm', 'base', 'lg'];

export const TEXT_POSITIONS = [
  { value: 'below', label: 'Below heading' },
  { value: 'above', label: 'Above heading' },
  { value: 'left', label: 'Left of heading' },
  { value: 'right', label: 'Right of heading' },
];

export const SUBHEADING_SIZE_CLASSES = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
};

export const DEFAULT_BRANDING = {
  heading: 'Importerr CRM',
  subheading: '',
  showLogo: true,
  showText: false,
  showHeading: true,
  showSubheading: false,
  subheadingSize: 'xs',
  textPosition: 'below',
  logoUrl: '',
  logoDarkUrl: '',
};

/** @deprecated use heading — kept for API compat */
export const legacyText = (b) => b?.heading ?? b?.text ?? DEFAULT_BRANDING.heading;

export function normalizeBranding(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BRANDING };
  const heading = String(raw.heading ?? raw.text ?? DEFAULT_BRANDING.heading).slice(0, 80);
  const subheading = String(raw.subheading ?? '').slice(0, 120);
  const subheadingSize = SUBHEADING_SIZES.includes(raw.subheadingSize)
    ? raw.subheadingSize
    : DEFAULT_BRANDING.subheadingSize;
  const textPosition = TEXT_POSITIONS.some((p) => p.value === raw.textPosition)
    ? raw.textPosition
    : DEFAULT_BRANDING.textPosition;

  return {
    heading,
    subheading,
    showLogo: raw.showLogo !== false,
    showText: Boolean(raw.showText),
    showHeading: raw.showHeading !== false,
    showSubheading: Boolean(raw.showSubheading),
    subheadingSize,
    textPosition,
    logoUrl: String(raw.logoUrl ?? '').slice(0, 500),
    logoDarkUrl: String(raw.logoDarkUrl ?? '').slice(0, 500),
  };
}

export const DEFAULT_LOGO_LIGHT = '/images/image.png';
export const DEFAULT_LOGO_DARK = '/images/logo_dark.png';

export function resolveBrandingAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/images/')) return url;
  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;
  return url;
}

export function getSidebarLogoSrc(branding, theme) {
  if (!branding?.showLogo) return null;
  const custom =
    theme === 'dark'
      ? branding.logoDarkUrl || branding.logoUrl
      : branding.logoUrl || branding.logoDarkUrl;
  if (custom) return resolveBrandingAssetUrl(custom);
  return theme === 'dark' ? DEFAULT_LOGO_DARK : DEFAULT_LOGO_LIGHT;
}

export function getBrandingTitle(branding) {
  const b = normalizeBranding(branding);
  if (b.showHeading && b.heading.trim()) return b.heading.trim();
  if (b.showSubheading && b.subheading.trim()) return b.subheading.trim();
  return 'CRM';
}

export function getCollapsedLabel(branding) {
  const b = normalizeBranding(branding);
  const src =
    b.showHeading && b.heading.trim()
      ? b.heading
      : b.showSubheading && b.subheading.trim()
        ? b.subheading
        : 'C';
  return src.charAt(0).toUpperCase();
}
