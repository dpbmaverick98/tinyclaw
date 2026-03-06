"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/chat-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  MessageSquare,
  Settings,
  Plus,
  Hash,
  Users,
  Search,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  agents: Record<string, { name: string; provider: string; model: string }>;
  teams: Record<string, { name: string; agents: string[] }>;
}

export function Sidebar({ agents, teams }: SidebarProps) {
  const pathname = usePathname();
  const totalUnread = useChatStore((state) => state.getTotalUnreadCount());
  const threads = useChatStore((state) => state.threads);
  
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const agentList = Object.entries(agents);
  const teamList = Object.entries(teams);
  
  const filteredAgents = agentList.filter(([id, agent]) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredTeams = teamList.filter(([id, team]) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnreadCount = (threadId: string) => threads[threadId]?.unreadCount || 0;

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold">TinyClaw</span>
      </div>

      {/* New Chat */}
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
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          <NavItem href="/" icon={LayoutDashboard} active={pathname === "/"}>
            Dashboard
          </NavItem>
          
          <NavItem href="/inbox" icon={Inbox} active={pathname === "/inbox"} badge={totalUnread > 0 ? totalUnread : undefined}>
            Inbox
          </NavItem>
          
          <NavItem href="/tasks" icon={ClipboardList} active={pathname.startsWith("/tasks")}>
            Tasks
          </NavItem>
        </div>

        <Separator className="my-3" />

        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </div>
        
        <div className="space-y-1">
          <NavItem href="/activity" icon={MessageSquare} active={pathname === "/activity"}>
            Activity
          </NavItem>
          
          <NavItem href="/settings" icon={Settings} active={pathname === "/settings"}>
            Settings
          </NavItem>
        </div>

        {agentList.length > 0 && (
          <>
            <Separator className="my-3" />
            
            <button
              onClick={() => setAgentsOpen(!agentsOpen)}
              className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <span>Agents</span>
              {agentsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            
            {agentsOpen && (
              <div className="mt-1 space-y-0.5">
                {filteredAgents.map(([id, agent]) => {
                  const href = `/chat/agent/${id}`;
                  const active = pathname === href;
                  const unread = getUnreadCount(id);
                  
                  return (
                    <Link
                      key={id}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Hash className="h-3.5 w-3.5" />
                      <span className="flex-1 truncate">{agent.name}</span>
                      {unread > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1 text-xs">{unread}</Badge>
                      )}
                    </Link>
                  );
                })}
                <Link
                  href="/agents"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add agent</span>
                </Link>
              </div>
            )}
          </>
        )}

        {teamList.length > 0 && (
          <>
            <Separator className="my-3" />
            
            <button
              onClick={() => setTeamsOpen(!teamsOpen)}
              className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <span>Teams</span>
              {teamsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            
            {teamsOpen && (
              <div className="mt-1 space-y-0.5">
                {filteredTeams.map(([id, team]) => {
                  const href = `/chat/team/${id}`;
                  const active = pathname === href;
                  const unread = getUnreadCount(id);
                  
                  return (
                    <Link
                      key={id}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="flex-1 truncate">{team.name}</span>
                      {unread > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1 text-xs">{unread}</Badge>
                      )}
                    </Link>
                  );
                })}
                <Link
                  href="/teams"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add team</span>
                </Link>
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-green-500" />
          Queue Processor Active
        </div>
      </div>
    </div>
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
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{children}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="default" className="h-5 min-w-5 px-1 text-xs">{badge}</Badge>
      )}
    </Link>
  );
}
