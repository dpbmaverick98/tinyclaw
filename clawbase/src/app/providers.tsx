'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DataProvider } from '@/components/layout/DataProvider';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

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
