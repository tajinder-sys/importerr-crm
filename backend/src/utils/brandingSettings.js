const path = require('path');
const fs = require('fs');
const CrmSetting = require('../models/CrmSetting');

const BRANDING_GROUP = 'branding';
const SETTING_KEY = 'sidebar_branding';

const SUBHEADING_SIZES = ['xs', 'sm', 'base', 'lg'];
const TEXT_POSITIONS = ['below', 'above', 'left', 'right'];

const DEFAULT_BRANDING = {
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

const DEFAULT_ROW = {
  key: SETTING_KEY,
  value: JSON.stringify(DEFAULT_BRANDING),
  type: 'json',
  label: 'Sidebar branding',
  description: 'Logo, heading, and subheading shown in the app sidebar.',
  group: BRANDING_GROUP,
};

const parseBranding = (raw) => {
  if (!raw || !String(raw).trim()) return { ...DEFAULT_BRANDING };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_BRANDING };

    const heading = String(parsed.heading ?? parsed.text ?? DEFAULT_BRANDING.heading).slice(0, 80);
    const subheading = String(parsed.subheading ?? '').slice(0, 120);
    const subheadingSize = SUBHEADING_SIZES.includes(parsed.subheadingSize)
      ? parsed.subheadingSize
      : DEFAULT_BRANDING.subheadingSize;
    const textPosition = TEXT_POSITIONS.includes(parsed.textPosition)
      ? parsed.textPosition
      : DEFAULT_BRANDING.textPosition;

    return {
      heading,
      subheading,
      showLogo: parsed.showLogo !== false,
      showText: Boolean(parsed.showText),
      showHeading: parsed.showHeading !== false,
      showSubheading: Boolean(parsed.showSubheading),
      subheadingSize,
      textPosition,
      logoUrl: String(parsed.logoUrl ?? '').slice(0, 500),
      logoDarkUrl: String(parsed.logoDarkUrl ?? '').slice(0, 500),
    };
  } catch {
    return { ...DEFAULT_BRANDING };
  }
};

const hasVisibleText = (b) =>
  (b.showHeading && b.heading.trim()) || (b.showSubheading && b.subheading.trim());

const validateBranding = (next) => {
  if (!next.showLogo && !(next.showText && hasVisibleText(next))) {
    return 'Enable logo or at least one line of text (heading or subheading)';
  }
  if (next.showText && !hasVisibleText(next)) {
    return 'Enter heading or subheading text, or turn off “Show text”';
  }
  if (next.showSubheading && !next.subheading.trim()) {
    return 'Subheading text is empty — add text or disable subheading';
  }
  if (next.showHeading && !next.heading.trim()) {
    return 'Heading text is empty — add text or disable heading';
  }
  return null;
};

const ensureBrandingSettings = async () => {
  await CrmSetting.updateOne({ key: SETTING_KEY }, { $setOnInsert: DEFAULT_ROW }, { upsert: true });
};

const getBranding = async () => {
  await ensureBrandingSettings();
  const row = await CrmSetting.findOne({ key: SETTING_KEY }).lean();
  return parseBranding(row?.value);
};

const saveBranding = async (payload) => {
  await ensureBrandingSettings();
  const current = await getBranding();

  const next = {
    heading: payload.heading !== undefined ? String(payload.heading).slice(0, 80) : current.heading,
    subheading:
      payload.subheading !== undefined ? String(payload.subheading).slice(0, 120) : current.subheading,
    showLogo: payload.showLogo !== undefined ? Boolean(payload.showLogo) : current.showLogo,
    showText: payload.showText !== undefined ? Boolean(payload.showText) : current.showText,
    showHeading: payload.showHeading !== undefined ? Boolean(payload.showHeading) : current.showHeading,
    showSubheading:
      payload.showSubheading !== undefined ? Boolean(payload.showSubheading) : current.showSubheading,
    subheadingSize:
      payload.subheadingSize !== undefined && SUBHEADING_SIZES.includes(payload.subheadingSize)
        ? payload.subheadingSize
        : current.subheadingSize,
    textPosition:
      payload.textPosition !== undefined && TEXT_POSITIONS.includes(payload.textPosition)
        ? payload.textPosition
        : current.textPosition,
    logoUrl: payload.logoUrl !== undefined ? String(payload.logoUrl).slice(0, 500) : current.logoUrl,
    logoDarkUrl:
      payload.logoDarkUrl !== undefined ? String(payload.logoDarkUrl).slice(0, 500) : current.logoDarkUrl,
  };

  const err = validateBranding(next);
  if (err) return { error: err };

  const row = await CrmSetting.findOne({ key: SETTING_KEY });
  row.value = JSON.stringify(next);
  row.type = 'json';
  await row.save();
  return { branding: next };
};

const uploadsRoot = path.join(__dirname, '../../uploads/branding');

const resolveStoredPath = (url) => {
  if (!url || !url.startsWith('/uploads/branding/')) return null;
  const filename = path.basename(url);
  return path.join(uploadsRoot, filename);
};

const deleteStoredLogo = (url) => {
  const filePath = resolveStoredPath(url);
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
};

module.exports = {
  BRANDING_GROUP,
  SETTING_KEY,
  DEFAULT_BRANDING,
  SUBHEADING_SIZES,
  TEXT_POSITIONS,
  ensureBrandingSettings,
  getBranding,
  saveBranding,
  parseBranding,
  deleteStoredLogo,
  uploadsRoot,
};
