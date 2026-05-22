import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useBranding } from '../../contexts/BrandingContext.jsx';
import {
  DEFAULT_BRANDING,
  getBrandingTitle,
  getCollapsedLabel,
  getSidebarLogoSrc,
  normalizeBranding,
} from '../../utils/branding';
import { cn } from '../../utils/helpers';
import BrandingTextStack from './BrandingTextStack';

const SidebarBrand = ({ collapsed = false, override = null }) => {
  const { theme } = useTheme();
  const { branding: ctxBranding } = useBranding();
  const branding = normalizeBranding(override ? { ...DEFAULT_BRANDING, ...override } : ctxBranding);

  const showLogo = Boolean(branding.showLogo);
  const showText = Boolean(branding.showText);
  const hasTextBlock =
    showText &&
    ((branding.showHeading && branding.heading.trim()) ||
      (branding.showSubheading && branding.subheading.trim()));
  const logoSrc = getSidebarLogoSrc(branding, theme);
  const title = getBrandingTitle(branding);
  const collapsedLabel = getCollapsedLabel(branding);

  if (!showLogo && !hasTextBlock) {
    return (
      <span className="text-xs text-gray-400 dark:text-slate-500" title={title}>
        —
      </span>
    );
  }

  if (collapsed) {
    if (showLogo && logoSrc) {
      return (
        <img
          src={logoSrc}
          alt={title}
          title={title}
          className="h-9 w-9 shrink-0 rounded-lg object-contain"
        />
      );
    }
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300"
        title={title}
      >
        {collapsedLabel}
      </div>
    );
  }

  const textPosition = branding.textPosition || 'below';
  const textIsHorizontal = textPosition === 'left' || textPosition === 'right';

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2',
        textIsHorizontal && hasTextBlock ? 'max-w-[220px]' : 'max-w-[200px]'
      )}
      title={title}
    >
      {showLogo && logoSrc && (
        <img
          src={logoSrc}
          alt={title}
          className={cn(
            'shrink-0 rounded-md object-contain object-left',
            hasTextBlock ? 'h-9 w-auto max-w-[72px]' : 'h-10 w-auto max-w-[140px]'
          )}
        />
      )}
      {hasTextBlock && <BrandingTextStack branding={branding} compact={Boolean(showLogo && logoSrc)} />}
    </div>
  );
};

export default SidebarBrand;
