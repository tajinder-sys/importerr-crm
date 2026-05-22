import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';
import { DEFAULT_BRANDING, normalizeBranding } from '../utils/branding';

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const loadBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.settings.branding);
      if (res?.success && res.data?.branding) {
        setBranding(normalizeBranding(res.data.branding));
      }
    } catch {
      setBranding(DEFAULT_BRANDING);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  const value = useMemo(
    () => ({
      branding,
      loading,
      setBranding,
      refreshBranding: loadBranding,
    }),
    [branding, loading, loadBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
}
