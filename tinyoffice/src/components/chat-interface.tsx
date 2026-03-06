"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/lib/chat-store";
import { getAgents, getTeams, sendMessage, subscribeToEvents, type AgentConfig, type TeamConfig, type EventData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, Users, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ChatPageProps {
  agents: Record<string, AgentConfig>;
  teams: Record<string, TeamConfig>;
}

export default function ChatPage({ agents, teams }: ChatPageProps) {
  const params = useParams();
  const agentId = params?.agent as string | undefined;
  const teamId = params?.team as string | undefined;
  
  const threadId = agentId || teamId;
  const threadType = agentId ? "agent" : teamId ? "team" : null;
  
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { getOrCreateThread, getThreadMessages, addMessage, setActiveThread } = useChatStore();
  
  const thread = threadId && threadType 
    ? getOrCreateThread(threadId, threadType, threadId)
    : null;
  
  const messages = threadId ? getThreadMessages(threadId) : [];
  
  const agent = agentId ? agents[agentId] : null;
  const team = teamId ? teams[teamId] : null;
  
  const displayName = agent?.name || team?.name || "New Chat";
  const displayHandle = threadId ? `@${threadId}` : "";

  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
      return () => setActiveThread(null);
    }
  }, [threadId, setActiveThread]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  useEffect(() => {
    if (!threadId) return;
    
    const unsub = subscribeToEvents(
      (event: EventData) => {
        const e = event as Record<string, unknown>;
        
        if (event.type === "response_ready" || event.type === "chain_step_done") {
          const responseText = e.responseText as string;
          const eventAgentId = e.agentId as string;
          
          if (responseText && eventAgentId) {
            const isForThisThread = 
              (threadType === "agent" && eventAgentId === threadId) ||
              (threadType === "team" && team?.agents.includes(eventAgentId));
            
            if (isForThisThread) {
              addMessage(threadId, {
                role: "agent",
                content: responseText,
                agentId: eventAgentId,
                agentName: agents[eventAgentId]?.name,
                status: "sent",
              });
              setIsTyping(false);
            }
          }
        }
        
        if (event.type === "chain_step_start") {
          const eventAgentId = e.agentId as string;
          const isForThisThread = 
            (threadType === "agent" && eventAgentId === threadId) ||
            (threadType === "team" && team?.agents.includes(eventAgentId));
          
          if (isForThisThread) setIsTyping(true);
        }
      },
      () => {}
    );
    
    return unsub;
  }, [threadId, threadType, team, agents, addMessage]);

  const handleSend = async () => {
    if (!message.trim() || !threadId || isSending) return;
    
    const content = message.trim();
    const finalMessage = threadId ? `@${threadId} ${content}` : content;
    
    addMessage(threadId, {
      role: "user",
      content,
      status: "sending",
    });
    
    setMessage("");
    setIsSending(true);
    
    try {
      await sendMessage({
        message: finalMessage,
        sender: "Web",
        channel: "web",
      });
      setIsTyping(true);
    } catch (err) {
      console.error("Failed to send:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state - no agent/team selected
  if (!threadId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Bot className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Start a conversation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an agent or team from the sidebar to begin chatting
          </p>
          
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {Object.entries(agents).slice(0, 3).map(([id, agent]) => (
              <Link key={id} href={`/chat/agent/${id}`}>
                <Button variant="outline" size="sm">
                  <Bot className="mr-1 h-3 w-3" />
                  {agent.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/chat">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        
        {agent ? (
          <>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-secondary text-xs">
                {agent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{agent.name}</span>
                <Badge variant="secondary" className="text-xs">{agent.provider}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{displayHandle}</p>
            </div>
          </>
        ) : team ? (
          <>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-secondary">
                <Users className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{team.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {team.agents.length} agents
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{displayHandle}</p>
            </div>
          </>
        ) : null}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} agents={agents} />
            ))}
            
            {isTyping && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center rounded-lg bg-muted px-3 py-2">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${displayName}...`}
            rows={1}
            className="min-h-[44px] flex-1 resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  agents,
}: {
  message: { id: string; role: string; content: string; agentId?: string; agentName?: string; timestamp: number };
  agents: Record<string, AgentConfig>;
}) {
  const isUser = message.role === "user";
  
  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-8 w-8 shrink-0">
        {isUser ? (
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            You
          </AvatarFallback>
        ) : (
          <AvatarFallback className="bg-secondary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>
      
      <div className={cn("flex max-w-[80%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {!isUser && message.agentName && (
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {message.agentName}
            </span>
          )}
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
        
        <span className="mt-1 text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
