'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { DataProvider } from '@/components/layout/DataProvider';
import { useClawStore } from '@/stores/useClawStore';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useClawStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DataProvider>{children}</DataProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
