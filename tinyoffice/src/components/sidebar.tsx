"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePolling } from "@/lib/hooks";
import { useChatStore } from "@/lib/chat-store";
import { getAgents, getTeams, type AgentConfig, type TeamConfig } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  LayoutDashboard,
  Inbox,
  ClipboardList,
  Settings,
  ChevronDown,
  Hash,
  Users,
  MessageSquare,
  Bot,
  Search,
  Zap,
} from "lucide-react";
import { useState } from "react";

// Agent status indicator - disabled until real status API available
// function StatusDot({ status }: { status: "online" | "busy" | "offline" }) {
//   const colors = {
//     online: "bg-[var(--agent-online)]",
//     busy: "bg-[var(--agent-busy)]",
//     offline: "bg-[var(--agent-offline)]",
//   };
//   return (
//     <span className={cn("h-1.5 w-1.5 rounded-full", colors[status])} />
//   );
// }

export function Sidebar() {
  const pathname = usePathname();
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  const totalUnread = useChatStore((state) => state.getTotalUnreadCount());
  
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const agentEntries = agents ? Object.entries(agents) : [];
  const teamEntries = teams ? Object.entries(teams) : [];
  
  const filteredAgents = agentEntries.filter(([id, agent]) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredTeams = teamEntries.filter(([id, team]) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[var(--border)] bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent-blue)]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-[var(--text-primary)]">TinyClaw</span>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-2">
        <Link href="/chat">
          <Button className="w-full justify-start gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] pl-8 pr-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-blue)]"
          />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        <NavItem href="/" icon={LayoutDashboard} active={isActive("/")}>
          Dashboard
        </NavItem>
        
        <NavItem href="/inbox" icon={Inbox} active={isActive("/inbox")} badge={totalUnread > 0 ? totalUnread : undefined}>
          Inbox
        </NavItem>
        
        <NavItem href="/tasks" icon={ClipboardList} active={isActive("/tasks")}>
          Tasks
        </NavItem>

        {/* Workspace Section */}
        <div className="pt-4">
          <SectionHeader>Workspace</SectionHeader>
          
          <NavItem href="/activity" icon={MessageSquare} active={isActive("/activity")}>
            Activity
          </NavItem>
          
          <NavItem href="/settings" icon={Settings} active={isActive("/settings")}>
            Settings
          </NavItem>
        </div>

        {/* Agents Section */}
        {agentEntries.length > 0 && (
          <div className="pt-4">
            <Collapsible open={agentsOpen} onOpenChange={setAgentsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <span>Agents</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", agentsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="space-y-0.5 pt-1">
                  {filteredAgents.map(([id, agent]) => {
                    const href = `/chat/agent/${id}`;
                    const active = pathname === href;
                    const unread = useChatStore((state) => state.getUnreadCount(id));
                    
                    return (
                      <Link
                        key={id}
                        href={href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <Hash className="h-3 w-3 text-[var(--text-tertiary)]" />
                        <span className="flex-1 truncate">{agent.name}</span>
                        {unread > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-blue)] px-1 text-[10px] font-medium text-white">
                            {unread}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  
                  <Link
                    href="/agents"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add agent</span>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Teams Section */}
        {teamEntries.length > 0 && (
          <div className="pt-4">
            <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <span>Teams</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", teamsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="space-y-0.5 pt-1">
                  {filteredTeams.map(([id, team]) => {
                    const href = `/chat/team/${id}`;
                    const active = pathname === href;
                    const unread = useChatStore((state) => state.getUnreadCount(id));
                    
                    return (
                      <Link
                        key={id}
                        href={href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          active
                            ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        <Users className="h-3 w-3 text-[var(--text-tertiary)]" />
                        <span className="flex-1 truncate">{team.name}</span>
                        {unread > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-blue)] px-1 text-[10px] font-medium text-white">
                            {unread}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                  
                  <Link
                    href="/teams"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add team</span>
                  </Link>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </nav>

      {/* Bottom Status */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--accent-green)]" />
          Queue Processor Active
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  icon: Icon,
  children,
  active,
  badge,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{children}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-blue)] px-1 text-[10px] font-medium text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
      {children}
    </div>
  );
}
