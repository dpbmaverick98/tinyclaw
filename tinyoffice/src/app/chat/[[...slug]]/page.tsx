"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChatStore, type ChatMessage } from "@/lib/chat-store";
import { usePolling } from "@/lib/hooks";
import { getAgents, getTeams, sendMessage, subscribeToEvents, type AgentConfig, type TeamConfig, type EventData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Bot, Users, Hash, AlertCircle, Check, Clock } from "lucide-react";

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)] animate-typing" />
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)] animate-typing [animation-delay:0.2s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)] animate-typing [animation-delay:0.4s]" />
    </div>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  
  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          isUser
            ? "bg-[var(--accent-blue)]"
            : "bg-[var(--surface-hover)] border border-[var(--border)]"
        )}
      >
        {isUser ? (
          <span className="text-xs font-medium text-white">You</span>
        ) : (
          <Bot className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
        )}
      </div>
      
      {/* Content */}
      <div className={cn("flex max-w-[80%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative rounded-lg px-3 py-2 text-sm",
            isUser
              ? "bg-[var(--accent-blue)] text-white"
              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {isError && (
            <div className="mt-1 flex items-center gap-1 text-xs text-red-300">
              <AlertCircle className="h-3 w-3" />
              {message.error || "Failed to send"}
            </div>
          )}
        </div>
        
        {/* Metadata */}
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
          <span>{formatTime(message.timestamp)}</span>
          {isUser && message.status === "sending" && <Clock className="h-3 w-3" />}
          {isUser && message.status === "sent" && <Check className="h-3 w-3" />}
          {isUser && message.status === "error" && <AlertCircle className="h-3 w-3 text-red-400" />}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const params = useParams();
  const threadId = params?.id as string | undefined;
  const threadType = params?.agent ? "agent" : params?.team ? "team" : null;
  
  const { data: agents } = usePolling<Record<string, AgentConfig>>(getAgents, 5000);
  const { data: teams } = usePolling<Record<string, TeamConfig>>(getTeams, 5000);
  
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    getOrCreateThread, 
    getThreadMessages, 
    addMessage, 
    updateMessage,
    setActiveThread 
  } = useChatStore();
  
  // Get thread info
  const thread = threadId && threadType 
    ? getOrCreateThread(threadId, threadType, threadId)
    : null;
  
  const messages = threadId ? getThreadMessages(threadId) : [];
  
  // Get agent/team details
  const agent = threadId && agents?.[threadId] 
    ? { ...agents[threadId], id: threadId } 
    : null;
  
  const team = threadId && teams?.[threadId]
    ? { ...teams[threadId], id: threadId }
    : null;
  
  const displayName = agent?.name || team?.name || threadId || "New Chat";
  const displayHandle = threadId ? `@${threadId}` : "";
  
  // Set active thread on mount
  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
    }
    return () => setActiveThread(null);
  }, [threadId, setActiveThread]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);
  
  // Subscribe to SSE events for responses
  useEffect(() => {
    if (!threadId) return;
    
    const unsub = subscribeToEvents(
      (event: EventData) => {
        const e = event as Record<string, unknown>;
        
        // Handle agent responses
        if (event.type === "response_ready" || event.type === "chain_step_done") {
          const responseText = e.responseText as string;
          const agentId = e.agentId as string;
          
          if (responseText && agentId) {
            // Check if this response is for our thread
            const isForThisThread = 
              (threadType === "agent" && agentId === threadId) ||
              (threadType === "team" && team?.agents.includes(agentId));
            
            if (isForThisThread) {
              addMessage(threadId, {
                role: "agent",
                content: responseText,
                agentId,
                agentName: agents?.[agentId]?.name || agentId,
                status: "sent",
              });
              setIsTyping(false);
            }
          }
        }
        
        // Show typing indicator when agent starts processing
        if (event.type === "chain_step_start") {
          const agentId = e.agentId as string;
          if (agentId) {
            const isForThisThread = 
              (threadType === "agent" && agentId === threadId) ||
              (threadType === "team" && team?.agents.includes(agentId));
            
            if (isForThisThread) {
              setIsTyping(true);
            }
          }
        }
      },
      () => {}
    );
    
    return unsub;
  }, [threadId, threadType, team, agents, addMessage]);
  
  const handleSend = useCallback(async () => {
    if (!message.trim() || !threadId || isSending) return;
    
    const content = message.trim();
    const finalMessage = threadId ? `@${threadId} ${content}` : content;
    
    // Add user message immediately
    addMessage(threadId, {
      role: "user",
      content,
      status: "sending",
    });
    
    setMessage("");
    setIsSending(true);
    
    try {
      const result = await sendMessage({
        message: finalMessage,
        sender: "Web",
        channel: "web",
      });
      
      // Update message status
      const thread = useChatStore.getState().threads[threadId];
      const lastMessage = thread?.messages[thread.messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        updateMessage(threadId, lastMessage.id, { status: "sent" });
      }
      
      setIsTyping(true);
    } catch (err) {
      const thread = useChatStore.getState().threads[threadId];
      const lastMessage = thread?.messages[thread.messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        updateMessage(threadId, lastMessage.id, { 
          status: "error",
          error: (err as Error).message 
        });
      }
    } finally {
      setIsSending(false);
    }
  }, [message, threadId, isSending, addMessage, updateMessage]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Empty state when no thread selected
  if (!threadId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          <Bot className="h-6 w-6 text-[var(--text-tertiary)]" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">Start a conversation</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Select an agent or team from the sidebar to begin chatting
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-hover)] border border-[var(--border)]">
            {threadType === "team" ? (
              <Users className="h-4 w-4 text-[var(--text-secondary)]" />
            ) : (
              <Bot className="h-4 w-4 text-[var(--text-secondary)]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
              {displayHandle && (
                <Badge variant="outline" className="text-[10px] font-mono">
                  {displayHandle}
                </Badge>
              )}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">
              {threadType === "team" 
                ? `${team?.agents.length || 0} agents`
                : agent?.provider 
                  ? `${agent.provider} / ${agent.model}`
                  : "Agent"
              }
            </div>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-green)] animate-pulse-dot" />
          <span className="text-xs text-[var(--text-tertiary)]">Online</span>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-[var(--text-tertiary)]">
              No messages yet. Say hello to {displayName}!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-hover)] border border-[var(--border)]">
                  <Bot className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                </div>
                <TypingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Composer */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${displayName}...`}
            rows={1}
            className="min-h-[40px] flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || isSending}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--text-tertiary)]">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
