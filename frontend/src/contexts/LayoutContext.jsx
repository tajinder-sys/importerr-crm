import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'crm_sidebar_collapsed';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const value = useMemo(
    () => ({ sidebarCollapsed, setSidebarCollapsed, toggleSidebar }),
    [sidebarCollapsed]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return ctx;
}
