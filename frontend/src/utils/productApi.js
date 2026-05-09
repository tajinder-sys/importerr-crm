import api from './api';

// Get product variant details by ID
export const getProductVariantById = async (variantId) => {
  try {
    const response = await api.get(`/products/variants/${variantId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product variant:', error);
    throw error;
  }
};

// Get product draft details by ID
export const getProductDraftById = async (draftId) => {
  try {
    const response = await api.get(`/products/drafts/${draftId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product draft:', error);
    throw error;
  }
};

// Get all product variants for a specific product
export const getProductVariantsByProductId = async (productId) => {
  try {
    const response = await api.get(`/products/variants/product/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching product variants:', error);
    throw error;
  }
};

// Get all product drafts
export const getAllProductDrafts = async () => {
  try {
    const response = await api.get('/products/drafts');
    return response.data;
  } catch (error) {
    console.error('Error fetching product drafts:', error);
    throw error;
  }
};
