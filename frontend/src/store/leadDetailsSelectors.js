// store/leadDetailsSelectors.js
import { createSelector } from '@reduxjs/toolkit';
import { flattenVariants } from './leadDetailsSlice';

const selectSlice = (state) => state.leadDetails;

// ─── Primitive selectors ──────────────────────────────────────────────────────

export const selectLead = (state) => selectSlice(state).lead;
export const selectActivities = (state) => selectSlice(state).activities;
export const selectCommunications = (state) => selectSlice(state).communications;
export const selectLoadingLead = (state) => selectSlice(state).loadingLead;

export const selectProduct = (state) => selectSlice(state).product;
export const selectLoadingProduct = (state) => selectSlice(state).loadingProduct;

export const selectFinalPriceData = (state) => selectSlice(state).finalPriceData;
export const selectBaseFinalPrice = (state) => selectSlice(state).baseFinalPrice;
export const selectLoadingFinalPrice = (state) => selectSlice(state).loadingFinalPrice;
export const selectFinalPriceError = (state) => selectSlice(state).finalPriceError;

export const selectQuantityMap = (state) => selectSlice(state).quantityMap;
export const selectFormulaOverrides = (state) => selectSlice(state).formulaOverrides;

export const selectSendingCommunication = (state) => selectSlice(state).sendingCommunication;
export const selectSendingQuote = (state) => selectSlice(state).sendingQuote;

export const selectAssignableMembers = (state) => selectSlice(state).assignableMembers;
export const selectLoadingMembers = (state) => selectSlice(state).loadingMembers;
export const selectUpdatingLead = (state) => selectSlice(state).updatingLead;
export const selectUpdateLeadError = (state) => selectSlice(state).updateLeadError;

export const selectToast = (state) => selectSlice(state).toast;

// ─── Derived selectors ────────────────────────────────────────────────────────

/** Activities sorted newest-first */
export const selectSortedActivities = createSelector(selectActivities, (activities) =>
  [...activities].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
);

/** Breakdown rows — comes directly from finalPriceData, no duplication */
export const selectBreakdown = createSelector(
  selectFinalPriceData,
  (data) => data?.breakdown || []
);

/** Raw formula from server (source of truth for display values) */
export const selectServerFormula = createSelector(
  selectFinalPriceData,
  (data) => data?.raw?.formula || {}
);

/**
 * Effective formula = server formula merged with user overrides.
 * Only the overridden keys differ.
 */
export const selectEffectiveFormula = createSelector(
  selectServerFormula,
  selectFormulaOverrides,
  (serverFormula, overrides) => ({ ...serverFormula, ...overrides })
);

/** Current final price as a number */
export const selectCurrentFinalPrice = createSelector(
  selectFinalPriceData,
  (data) => Number(data?.finalPrice || 0)
);

/** Discount percent relative to baseline (first fetch) */
export const selectDiscountPercent = createSelector(
  selectBaseFinalPrice,
  selectCurrentFinalPrice,
  (base, current) => {
    if (!base) return 0;
    return ((base - current) / base) * 100;
  }
);

/**
 * Lead variants enriched with user-edited quantities.
 * This is what gets passed to the pricing breakdown modal.
 */
export const selectEnrichedVariants = createSelector(
  selectLead,
  selectQuantityMap,
  (lead, quantityMap) =>
    flattenVariants(lead?.variants).map((v) => ({
      ...v,
      selectedQuantity: quantityMap[String(v?.skuId ?? v?.id ?? '')] ?? Number(v?.quantity ?? 1),
    }))
);

/** Whether the user has any unsaved formula overrides */
export const selectHasFormulaOverrides = createSelector(
  selectFormulaOverrides,
  (overrides) => Object.keys(overrides).length > 0
);

/** Communication source options driven by lead source */
export const selectCommunicationSources = createSelector(selectLead, (lead) => {
  if (!lead?.source || lead.source === 'importerr_inquiry') {
    return [{ value: 'whatsapp' }, { value: 'email' }];
  }
  return [{ value: lead.source }];
});