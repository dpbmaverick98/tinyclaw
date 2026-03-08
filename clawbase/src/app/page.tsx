'use client';

import { Header } from '@/components/layout/Header';
import { AgentGrid } from '@/components/agents/AgentGrid';
import { AgentDetail } from '@/components/agents/AgentDetail';
import { useClawStore } from '@/stores/useClawStore';

export default function Home() {
  const selectedAgentId = useClawStore((state) => state.selectedAgentId);
  const filteredAgents = useClawStore((state) => state.getFilteredAgents());

  return (
    <main className="max-w-[1600px] mx-auto px-6">
      <Header />
      
      {selectedAgentId ? (
        <AgentDetail />
      ) : (
        <>
          {filteredAgents.length === 0 ? (
            <div className="flex items-center justify-center h-[60vh] text-white/30">
              <div className="text-center">
                <p className="text-xl mb-2">No agents found</p>
                <p className="text-sm">Create your first agent to get started</p>
              </div>
            </div>
          ) : (
            <AgentGrid agents={filteredAgents} />
          )}
        </>
      )}
    </main>
  );
}
