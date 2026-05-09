// store/leadDetailsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const flattenVariants = (variants) => {
  if (!variants) return [];
  if (Array.isArray(variants)) return variants;
  if (Array.isArray(variants.variantLines)) return variants.variantLines;
  if (Array.isArray(variants.variants)) return variants.variants;
  return [];
};

// Build { [skuId]: quantity } from lead variants
const buildQuantityMap = (variants) =>
  flattenVariants(variants).reduce((acc, v) => {
    const key = String(v?.skuId ?? v?.id ?? '');
    if (key) acc[key] = Number(v?.selectedQuantity ?? v?.quantity ?? 1);
    return acc;
  }, {});

// Merge lead variant quantities with any user edits
const buildVariantsPayload = (leadVariants, quantityMap) =>
  flattenVariants(leadVariants).map((v) => {
    const skuStr = String(v?.skuId ?? v?.id ?? '').trim();
    const skuId = /^\d+$/.test(skuStr) ? Number(skuStr) : skuStr;
    return {
      skuId,
      ap: Number(v?.ap ?? v?.unitPrice ?? 0),
      selectedQuantity: quantityMap[skuStr] ?? Number(v?.selectedQuantity ?? v?.quantity ?? 1),
    };
  });

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchLead = createAsyncThunk(
  'leadDetails/fetchLead',
  async (leadId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(API_ROUTES.leads.byId(leadId));
      return data; // { lead, activities, communications }
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load lead');
    }
  }
);

export const fetchProduct = createAsyncThunk(
  'leadDetails/fetchProduct',
  async (productRef, { rejectWithValue }) => {
    try {
      const { data } = await api.get(API_ROUTES.importerr.productVariantPriceDetails(productRef));
      return data?.product || null;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to fetch product');
    }
  }
);

export const fetchProductBySku = createAsyncThunk(
  'leadDetails/fetchProductBySku',
  async (sku, { rejectWithValue }) => {
    try {
      const { data } = await api.get(API_ROUTES.importerr.productBySku(sku));
      return data || null;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to fetch product by SKU');
    }
  }
);

export const fetchFinalPrice = createAsyncThunk(
  'leadDetails/fetchFinalPrice',
  async ({ offerId, leadVariants, quantityMap, formulaOverrides }, { rejectWithValue }) => {
    try {
      const variants = buildVariantsPayload(leadVariants, quantityMap);
      const { data } = await api.post(
        API_ROUTES.importerr.finalPriceByOfferId(),
        {
          offerId: String(offerId),
          variants,
          ...(formulaOverrides ? { overrides: { formula: formulaOverrides } } : {}),
        },
        { timeout: 90000 }
      );
      return data;
      // Shape: { finalPrice, summary, variants, breakdown, raw: { formula, category } }
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to fetch final price');
    }
  }
);

export const sendQuote = createAsyncThunk(
  'leadDetails/sendQuote',
  async ({ lead, finalPriceData, baseFinalPrice, quantityMap }, { rejectWithValue }) => {
    try {
      const currentPrice = Number(finalPriceData?.finalPrice || 0);
      const discountPercent = baseFinalPrice > 0
        ? ((baseFinalPrice - currentPrice) / baseFinalPrice) * 100
        : 0;

      if (discountPercent <= 0) {
        return rejectWithValue('Quote can only be sent when discount is greater than 0');
      }

      const variants = buildVariantsPayload(lead.variants, quantityMap);

      const { data } = await api.post(API_ROUTES.importerr.sendQuote(), {
        userId: lead.userId,
        offerId: String(lead.productSku),
        variants,
        amounts: {
          initialFinalPrice: baseFinalPrice,
          finalPrice: currentPrice,
          discountPercent: Number(discountPercent.toFixed(2)),
          savedAmount: Math.abs(Number((baseFinalPrice - currentPrice).toFixed(2))),
        },
      });

      return data?.referenceId || null;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to send quote');
    }
  }
);

export const sendCommunication = createAsyncThunk(
  'leadDetails/sendCommunication',
  async ({ leadId, message, source }, { rejectWithValue }) => {
    try {
      await api.post(API_ROUTES.leads.communications(leadId), { message, source });
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to send communication');
    }
  }
);

export const updateLead = createAsyncThunk(
  'leadDetails/updateLead',
  async ({ leadId, payload }, { rejectWithValue }) => {
    try {
      await api.put(API_ROUTES.leads.update(leadId), payload);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to update lead');
    }
  }
);

export const fetchAssignableMembers = createAsyncThunk(
  'leadDetails/fetchAssignableMembers',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(API_ROUTES.users.list, {
        params: { role: 'team_member', page: 1, limit: 200 },
      });
      return data?.users || [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load members');
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const leadDetailsSlice = createSlice({
  name: 'leadDetails',
  initialState: {
    lead: null,
    activities: [],
    communications: [],
    loadingLead: false,

    product: null,
    loadingProduct: false,

    // The full finalPrice API response — breakdown lives here, nothing duplicated
    finalPriceData: null,
    baseFinalPrice: null,   // locked on first successful fetch
    loadingFinalPrice: false,
    finalPriceError: null,

    // User-edited quantities keyed by skuId string
    quantityMap: {},

    // User-edited formula overrides keyed by formulaKey — null means "use server value"
    formulaOverrides: {},

    sendingCommunication: false,
    sendingQuote: false,

    assignableMembers: [],
    loadingMembers: false,
    updatingLead: false,
    updateLeadError: null,

    toast: null, // { message, type: 'success' | 'error' }
  },

  reducers: {
    reset: (state) => {
      Object.assign(state, leadDetailsSlice.getInitialState());
    },

    // Update qty for a single variant
    setVariantQuantity(state, { payload: { skuId, quantity } }) {
      state.quantityMap[String(skuId)] = Math.max(1, Number(quantity) || 1);
    },

    // Update a single formula lever override
    setFormulaOverride(state, { payload: { key, value } }) {
      // value === null → remove override (revert to server value)
      if (value === null || value === undefined || value === '') {
        delete state.formulaOverrides[key];
      } else {
        state.formulaOverrides[key] = Number.isFinite(Number(value)) ? Number(value) : value;
      }
    },

    // Reset all formula overrides (cancel edits)
    clearFormulaOverrides(state) {
      state.formulaOverrides = {};
    },

    clearToast(state) {
      state.toast = null;
    },

    clearUpdateLeadError(state) {
      state.updateLeadError = null;
    },
  },

  extraReducers: (builder) => {
    // ── fetchLead ──
    builder
      .addCase(fetchLead.pending, (state) => { state.loadingLead = true; })
      .addCase(fetchLead.fulfilled, (state, { payload }) => {
        state.loadingLead = false;
        state.lead = payload.lead;
        state.activities = payload.activities || [];
        state.communications = payload.communications || [];
        // Seed quantity map from lead variants
        state.quantityMap = buildQuantityMap(payload.lead?.variants);
        // Reset price baseline when lead changes
        state.baseFinalPrice = null;
        state.finalPriceData = null;
        state.formulaOverrides = {};
      })
      .addCase(fetchLead.rejected, (state, { payload }) => {
        state.loadingLead = false;
        state.toast = { message: payload, type: 'error' };
      });

    // ── fetchProduct / fetchProductBySku ──
    builder
      .addCase(fetchProduct.pending, (state) => { state.loadingProduct = true; })
      .addCase(fetchProduct.fulfilled, (state, { payload }) => {
        state.loadingProduct = false;
        state.product = payload;
      })
      .addCase(fetchProduct.rejected, (state) => { state.loadingProduct = false; })

      .addCase(fetchProductBySku.pending, (state) => { state.loadingProduct = true; })
      .addCase(fetchProductBySku.fulfilled, (state, { payload }) => {
        state.loadingProduct = false;
        state.product = payload;
        state.toast = { message: 'Product fetched successfully', type: 'success' };
      })
      .addCase(fetchProductBySku.rejected, (state, { payload }) => {
        state.loadingProduct = false;
        state.toast = { message: payload, type: 'error' };
      });

    // ── fetchFinalPrice ──
    builder
      .addCase(fetchFinalPrice.pending, (state) => {
        state.loadingFinalPrice = true;
        state.finalPriceError = null;
      })
      .addCase(fetchFinalPrice.fulfilled, (state, { payload }) => {
        state.loadingFinalPrice = false;
        state.finalPriceData = payload;
        // Lock baseline on first fetch only
        if (state.baseFinalPrice === null) {
          state.baseFinalPrice = Number(payload.finalPrice || 0);
        }
      })
      .addCase(fetchFinalPrice.rejected, (state, { payload }) => {
        state.loadingFinalPrice = false;
        state.finalPriceError = payload;
        state.toast = { message: payload, type: 'error' };
      });

    // ── sendQuote ──
    builder
      .addCase(sendQuote.pending, (state) => { state.sendingQuote = true; })
      .addCase(sendQuote.fulfilled, (state, { payload: refId }) => {
        state.sendingQuote = false;
        state.toast = {
          message: refId ? `Quote sent. Ref: ${refId}` : 'Quote sent successfully',
          type: 'success',
        };
      })
      .addCase(sendQuote.rejected, (state, { payload }) => {
        state.sendingQuote = false;
        state.toast = { message: payload, type: 'error' };
      });

    // ── sendCommunication ──
    builder
      .addCase(sendCommunication.pending, (state) => { state.sendingCommunication = true; })
      .addCase(sendCommunication.fulfilled, (state) => {
        state.sendingCommunication = false;
        state.toast = { message: 'Communication sent successfully', type: 'success' };
      })
      .addCase(sendCommunication.rejected, (state, { payload }) => {
        state.sendingCommunication = false;
        state.toast = { message: payload, type: 'error' };
      });

    // ── updateLead ──
    builder
      .addCase(updateLead.pending, (state) => {
        state.updatingLead = true;
        state.updateLeadError = null;
      })
      .addCase(updateLead.fulfilled, (state) => {
        state.updatingLead = false;
        state.toast = { message: 'Lead updated successfully', type: 'success' };
      })
      .addCase(updateLead.rejected, (state, { payload }) => {
        state.updatingLead = false;
        state.updateLeadError = payload;
      });

    // ── fetchAssignableMembers ──
    builder
      .addCase(fetchAssignableMembers.pending, (state) => { state.loadingMembers = true; })
      .addCase(fetchAssignableMembers.fulfilled, (state, { payload }) => {
        state.loadingMembers = false;
        state.assignableMembers = payload;
      })
      .addCase(fetchAssignableMembers.rejected, (state, { payload }) => {
        state.loadingMembers = false;
        state.updateLeadError = payload;
      });
  },
});

export const {
  reset,
  setVariantQuantity,
  setFormulaOverride,
  clearFormulaOverrides,
  clearToast,
  clearUpdateLeadError,
} = leadDetailsSlice.actions;

export default leadDetailsSlice.reducer;