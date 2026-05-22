import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ImageIcon, Save, Trash2, Type } from 'lucide-react';
import api from '../../utils/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { ROUTE_PATHS } from '../../routes/paths';
import { useAuth } from '../../hooks/useAuth';
import { useBranding } from '../../contexts/BrandingContext.jsx';
import { USER_ROLES } from '../../utils/constants';
import {
  DEFAULT_BRANDING,
  DEFAULT_LOGO_DARK,
  DEFAULT_LOGO_LIGHT,
  SUBHEADING_SIZES,
  TEXT_POSITIONS,
  normalizeBranding,
  resolveBrandingAssetUrl,
} from '../../utils/branding';
import ToggleSwitch from '../../components/common/ui/ToggleSwitch';
import Button from '../../components/common/ui/Button';
import Input from '../../components/common/ui/Input';
import Loading from '../../components/common/ui/Loading';
import Snackbar from '../../components/common/ui/Snackbar';
import { UiPageDescription, UiPageTitle } from '../../components/common/ui';
import SidebarBrand from '../../components/layout/SidebarBrand';
import { cn } from '../../utils/helpers';

const SIZE_LABELS = { xs: 'Extra small', sm: 'Small', base: 'Medium', lg: 'Large' };

const BrandingSettings = () => {
  const { user } = useAuth();
  const { branding, loading: brandingLoading, refreshBranding, setBranding } = useBranding();
  const isAdmin = user?.role === USER_ROLES.ADMIN;

  const [draft, setDraft] = useState(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' });
  const lightInputRef = useRef(null);
  const darkInputRef = useRef(null);

  useEffect(() => {
    setDraft(normalizeBranding(branding));
  }, [branding]);

  const patchDraft = (patch) => setDraft((prev) => normalizeBranding({ ...prev, ...patch }));

  const validateDraft = () => {
    const b = normalizeBranding(draft);
    const hasText =
      (b.showHeading && b.heading.trim()) || (b.showSubheading && b.subheading.trim());
    if (!b.showLogo && !(b.showText && hasText)) {
      return 'Enable logo or at least one line of text';
    }
    if (b.showText && !hasText) return 'Add heading or subheading text';
    if (b.showHeading && !b.heading.trim()) return 'Heading is empty — add text or turn off heading';
    if (b.showSubheading && !b.subheading.trim()) {
      return 'Subheading is empty — add text or turn off subheading';
    }
    return null;
  };

  const saveSettings = async () => {
    const err = validateDraft();
    if (err) {
      setSnackbar({ open: true, message: err, type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const b = normalizeBranding(draft);
      const res = await api.put(API_ROUTES.settings.branding, {
        heading: b.heading,
        subheading: b.subheading,
        showLogo: b.showLogo,
        showText: b.showText,
        showHeading: b.showHeading,
        showSubheading: b.showSubheading,
        subheadingSize: b.subheadingSize,
        textPosition: b.textPosition,
      });
      if (res?.success) {
        const next = normalizeBranding(res.data?.branding);
        setBranding(next);
        setDraft(next);
        setSnackbar({ open: true, message: 'Sidebar branding saved', type: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file, variant) => {
    if (!file) return;
    setUploading(variant);
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await api.post(`${API_ROUTES.settings.brandingLogo}?variant=${variant}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res?.success) {
        const next = normalizeBranding(res.data?.branding);
        setBranding(next);
        setDraft(next);
        await refreshBranding();
        setSnackbar({ open: true, message: 'Logo uploaded', type: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Upload failed', type: 'error' });
    } finally {
      setUploading(null);
    }
  };

  const removeLogo = async (variant) => {
    setUploading(variant);
    try {
      const res = await api.delete(`${API_ROUTES.settings.brandingLogo}?variant=${variant}`);
      if (res?.success) {
        const next = normalizeBranding(res.data?.branding);
        setBranding(next);
        setDraft(next);
        setSnackbar({ open: true, message: 'Logo removed', type: 'success' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || 'Remove failed', type: 'error' });
    } finally {
      setUploading(null);
    }
  };

  if (!isAdmin) {
    return <Navigate to={ROUTE_PATHS.DASHBOARD} replace />;
  }

  if (brandingLoading) {
    return <Loading className="py-16" text="Loading branding…" />;
  }

  return (
    <div className="mx-auto  space-y-8 p-6 pb-12">
      <Link
        to={ROUTE_PATHS.SETTINGS_API_CONFIG}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <div>
        <UiPageTitle>Sidebar branding</UiPageTitle>
        <UiPageDescription>
          Logo plus heading and subheading. Control subheading size and whether it sits above, below,
          left, or right of the heading.
        </UiPageDescription>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Preview
        </p>
        <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800">
          <SidebarBrand collapsed={false} override={draft} />
        </div>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Type className="h-4 w-4" />
          Heading & subheading
        </h2>

        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-700 dark:text-slate-300">Show text in sidebar</span>
          <ToggleSwitch
            checked={draft.showText}
            onChange={(v) => patchDraft({ showText: v })}
            ariaLabel="Show text in sidebar"
          />
        </label>

        {draft.showText && (
          <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700 dark:text-slate-300">Show heading</span>
                <ToggleSwitch
                  checked={draft.showHeading}
                  onChange={(v) => patchDraft({ showHeading: v })}
                  ariaLabel="Show heading"
                />
              </label>
              {draft.showHeading && (
                <Input
                  label="Heading"
                  value={draft.heading}
                  onChange={(e) => patchDraft({ heading: e.target.value })}
                  placeholder="e.g. Importerr"
                  maxLength={80}
                />
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700 dark:text-slate-300">Show subheading</span>
                <ToggleSwitch
                  checked={draft.showSubheading}
                  onChange={(v) => patchDraft({ showSubheading: v })}
                  ariaLabel="Show subheading"
                />
              </label>
              {draft.showSubheading && (
                <>
                  <Input
                    label="Subheading"
                    value={draft.subheading}
                    onChange={(e) => patchDraft({ subheading: e.target.value })}
                    placeholder="e.g. CRM Platform"
                    maxLength={120}
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Subheading size
                    </label>
                    <select
                      value={draft.subheadingSize}
                      onChange={(e) => patchDraft({ subheadingSize: e.target.value })}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {SUBHEADING_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {SIZE_LABELS[s] || s}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {draft.showHeading && draft.showSubheading && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                  Subheading position (relative to heading)
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TEXT_POSITIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => patchDraft({ textPosition: value })}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-xs font-medium transition',
                        draft.textPosition === value
                          ? 'border-primary-500 bg-primary-50 text-primary-800 dark:border-primary-500 dark:bg-primary-900/40 dark:text-primary-200'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:text-slate-400'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <ImageIcon className="h-4 w-4" />
          Logo
        </h2>
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm text-slate-700 dark:text-slate-300">Show logo in sidebar</span>
          <ToggleSwitch
            checked={draft.showLogo}
            onChange={(v) => patchDraft({ showLogo: v })}
            ariaLabel="Show logo in sidebar"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <LogoUploadCard
            title="Light mode logo"
            hint="PNG/JPG/WEBP/SVG, max 2MB."
            previewSrc={draft.logoUrl ? resolveBrandingAssetUrl(draft.logoUrl) : DEFAULT_LOGO_LIGHT}
            isCustom={Boolean(draft.logoUrl)}
            uploading={uploading === 'light'}
            inputRef={lightInputRef}
            onPick={() => lightInputRef.current?.click()}
            onFile={(f) => uploadLogo(f, 'light')}
            onRemove={() => removeLogo('light')}
          />
          <LogoUploadCard
            title="Dark mode logo (optional)"
            hint="Falls back to light logo if empty."
            previewSrc={
              draft.logoDarkUrl
                ? resolveBrandingAssetUrl(draft.logoDarkUrl)
                : draft.logoUrl
                  ? resolveBrandingAssetUrl(draft.logoUrl)
                  : DEFAULT_LOGO_DARK
            }
            isCustom={Boolean(draft.logoDarkUrl)}
            uploading={uploading === 'dark'}
            inputRef={darkInputRef}
            onPick={() => darkInputRef.current?.click()}
            onFile={(f) => uploadLogo(f, 'dark')}
            onRemove={() => removeLogo('dark')}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
        
          {saving ? 'Saving…' : 'Save branding'}
        </Button>
      </div>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </div>
  );
};

function LogoUploadCard({
  title,
  hint,
  previewSrc,
  isCustom,
  uploading,
  inputRef,
  onPick,
  onFile,
  onRemove,
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-600">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <div className="mt-3 flex h-16 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-900/60">
        <img src={previewSrc} alt="" className="max-h-14 max-w-full object-contain" />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onPick} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
        {isCustom && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            onClick={onRemove}
            disabled={uploading}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>
      {!isCustom && (
        <p className="mt-1 text-xs text-slate-400">Using default app logo until you upload.</p>
      )}
    </div>
  );
}

export default BrandingSettings;
