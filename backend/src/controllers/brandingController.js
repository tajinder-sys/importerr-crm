const {
  getBranding,
  saveBranding,
  deleteStoredLogo,
} = require('../utils/brandingSettings');
const { sendSuccess, sendBadRequest, sendServerError } = require('../utils/responseHandler');

const getSidebarBranding = async (_req, res) => {
  try {
    const branding = await getBranding();
    return sendSuccess(res, 'Sidebar branding retrieved', { branding });
  } catch (error) {
    console.error('getSidebarBranding error:', error);
    return sendServerError(res, error.message || 'Failed to load branding');
  }
};

const updateSidebarBranding = async (req, res) => {
  try {
    const {
      heading,
      subheading,
      text,
      showLogo,
      showText,
      showHeading,
      showSubheading,
      subheadingSize,
      textPosition,
    } = req.body || {};
    const result = await saveBranding({
      heading: heading ?? text,
      subheading,
      showLogo,
      showText,
      showHeading,
      showSubheading,
      subheadingSize,
      textPosition,
    });
    if (result.error) {
      return sendBadRequest(res, result.error);
    }
    return sendSuccess(res, 'Sidebar branding saved', { branding: result.branding });
  } catch (error) {
    console.error('updateSidebarBranding error:', error);
    return sendServerError(res, error.message || 'Failed to save branding');
  }
};

const uploadSidebarLogo = async (req, res) => {
  try {
    if (!req.file) {
      return sendBadRequest(res, 'Logo file is required');
    }
    const variant = String(req.query.variant || 'light').toLowerCase();
    if (!['light', 'dark'].includes(variant)) {
      return sendBadRequest(res, 'variant must be light or dark');
    }

    const branding = await getBranding();
    const publicPath = `/uploads/branding/${req.file.filename}`;
    const patch =
      variant === 'dark'
        ? { logoDarkUrl: publicPath, logoUrl: branding.logoUrl }
        : { logoUrl: publicPath, logoDarkUrl: branding.logoDarkUrl };

    const oldUrl = variant === 'dark' ? branding.logoDarkUrl : branding.logoUrl;
    deleteStoredLogo(oldUrl);

    const result = await saveBranding({
      logoUrl: patch.logoUrl,
      logoDarkUrl: patch.logoDarkUrl,
    });
    if (result.error) {
      return sendBadRequest(res, result.error);
    }
    return sendSuccess(res, 'Logo uploaded', { branding: result.branding });
  } catch (error) {
    console.error('uploadSidebarLogo error:', error);
    return sendServerError(res, error.message || 'Failed to upload logo');
  }
};

const removeSidebarLogo = async (req, res) => {
  try {
    const variant = String(req.query.variant || 'all').toLowerCase();
    if (!['light', 'dark', 'all'].includes(variant)) {
      return sendBadRequest(res, 'variant must be light, dark, or all');
    }

    const branding = await getBranding();
    const patch = { ...branding };

    if (variant === 'light' || variant === 'all') {
      deleteStoredLogo(branding.logoUrl);
      patch.logoUrl = '';
    }
    if (variant === 'dark' || variant === 'all') {
      deleteStoredLogo(branding.logoDarkUrl);
      patch.logoDarkUrl = '';
    }

    const result = await saveBranding(patch);
    if (result.error) {
      return sendBadRequest(res, result.error);
    }
    return sendSuccess(res, 'Logo removed', { branding: result.branding });
  } catch (error) {
    console.error('removeSidebarLogo error:', error);
    return sendServerError(res, error.message || 'Failed to remove logo');
  }
};

module.exports = {
  getSidebarBranding,
  updateSidebarBranding,
  uploadSidebarLogo,
  removeSidebarLogo,
};
