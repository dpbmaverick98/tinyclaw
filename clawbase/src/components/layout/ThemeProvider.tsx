'use client';

import { useEffect } from 'react';
import { useClawStore } from '@/stores/useClawStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useClawStore((state) => state.theme);

  // Apply theme immediately on mount and whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Also apply on initial mount to handle hydration mismatch
  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = useClawStore.getState().theme;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  return <>{children}</>;
}
