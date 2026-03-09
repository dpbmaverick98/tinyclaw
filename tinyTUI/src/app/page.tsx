'use client';

import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { PaneContainer } from '@/components/layout/PaneContainer';
import { AddModal } from '@/components/modals/AddModal';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { useSSE } from '@/hooks/useSSE';

export default function Home() {
  useSSE();

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        <PaneContainer />
        <Sidebar />
      </div>

      <AddModal />
      <NotificationDropdown />
    </div>
  );
}
