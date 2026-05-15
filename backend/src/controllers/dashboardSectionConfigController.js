const {
  getSectionsForDashboard,
  getVisibilityMap,
  updateSections,
  resetSectionsToDefaults,
  buildVisibilityMap,
} = require('../services/dashboardSectionConfigService');
const { sendSuccess, sendBadRequest, sendForbidden } = require('../utils/responseHandler');
const { USER_ROLES } = require('../utils/constants');

const isAdmin = (user) => user?.role === USER_ROLES.ADMIN;

async function getDashboardSections(req, res) {
  try {
    const sections = await getSectionsForDashboard();
    return sendSuccess(res, 'Dashboard sections retrieved', {
      sections,
      visibility: buildVisibilityMap(sections),
    });
  } catch (err) {
    console.error('getDashboardSections error:', err);
    return sendBadRequest(res, 'Failed to load dashboard sections');
  }
}

async function getDashboardSectionsVisibility(req, res) {
  try {
    const visibility = await getVisibilityMap();
    return sendSuccess(res, 'Dashboard visibility retrieved', { visibility });
  } catch (err) {
    console.error('getDashboardSectionsVisibility error:', err);
    return sendBadRequest(res, 'Failed to load dashboard visibility');
  }
}

async function updateDashboardSections(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return sendForbidden(res, 'Admin only');
    }
    const { sections } = req.body || {};
    const updated = await updateSections(sections, req.user.id || req.user._id);
    return sendSuccess(res, 'Dashboard sections updated', {
      sections: updated,
      visibility: buildVisibilityMap(updated),
    });
  } catch (err) {
    if (err.statusCode === 400) return sendBadRequest(res, err.message);
    console.error('updateDashboardSections error:', err);
    return sendBadRequest(res, 'Failed to update dashboard sections');
  }
}

async function resetDashboardSections(req, res) {
  try {
    if (!isAdmin(req.user)) {
      return sendForbidden(res, 'Admin only');
    }
    const updated = await resetSectionsToDefaults(req.user.id || req.user._id);
    return sendSuccess(res, 'Dashboard sections reset to defaults', {
      sections: updated,
      visibility: buildVisibilityMap(updated),
    });
  } catch (err) {
    console.error('resetDashboardSections error:', err);
    return sendBadRequest(res, 'Failed to reset dashboard sections');
  }
}

module.exports = {
  getDashboardSections,
  getDashboardSectionsVisibility,
  updateDashboardSections,
  resetDashboardSections,
};
