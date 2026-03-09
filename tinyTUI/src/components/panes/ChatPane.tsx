'use client';

import { useRef, useEffect } from 'react';
import { useClawStore } from '@/stores/useClawStore';
import { ChatPane as ChatPaneType } from '@/types';
import { sendMessage } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface ChatPaneProps {
  pane: ChatPaneType;
  isActive: boolean;
  onActivate: () => void;
}

export function ChatPane({ pane, isActive, onActivate }: ChatPaneProps) {
  const { agents, updatePaneInput, addMessage, markPaneRead } = useClawStore();
  const agent = agents.find(a => a.id === pane.agentId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pane.messages]);

  useEffect(() => {
    if (isActive && pane.hasNewMessage) {
      markPaneRead(pane.id);
    }
  }, [isActive, pane.hasNewMessage, pane.id, markPaneRead]);

  if (!agent) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pane.input.trim()) return;

    const content = pane.input;

    // Add user message locally
    addMessage(pane.id, {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content,
      timestamp: Date.now(),
    });

    updatePaneInput(pane.id, '');

    // Send to server - use correct payload format
    try {
      await sendMessage({
        message: content,
        agent: agent.id,
      });
      // Response will come via SSE
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error in chat
      addMessage(pane.id, {
        id: `msg-${Date.now()}-error`,
        role: 'agent',
        content: 'error: failed to send message',
        timestamp: Date.now(),
      });
    }
  };

  return (
    <div
      onClick={onActivate}
      className={`
        bg-[var(--bg-primary)] flex flex-col min-h-0 h-full
        ${isActive ? 'ring-1 ring-[var(--text-secondary)]' : ''}
        ${pane.hasNewMessage ? 'pane-new-message ring-1 ring-[var(--accent)]' : ''}
      `}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {pane.messages.length === 0 && (
          <div className="text-[var(--text-muted)] text-sm">
            start a conversation with {agent.name}
          </div>
        )}
        {pane.messages.map(msg => (
          <div key={msg.id} className="text-sm">
            <span className={`
              ${msg.role === 'user' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}
            `}>
              {msg.role === 'user' ? 'you' : agent.name}:
            </span>
            {' '}
            {msg.role === 'user' ? (
              <span className="text-[var(--text-primary)]">{msg.content}</span>
            ) : (
              <div className="text-[var(--text-primary)] prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    pre: ({ children }) => (
                      <pre className="bg-[var(--bg-secondary)] p-2 rounded overflow-x-auto my-2">{children}</pre>
                    ),
                    code: ({ children }) => (
                      <code className="bg-[var(--bg-secondary)] px-1 rounded text-xs">{children}</code>
                    ),
                    p: ({ children }) => <p className="my-1">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc ml-4 my-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-4 my-1">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                    h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,
                    a: ({ children, href }) => <a href={href} className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--border-color)] p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pane.input}
            onChange={(e) => updatePaneInput(pane.id, e.target.value)}
            placeholder={`message ${agent.name}...`}
            className="
              flex-1 bg-transparent border-none outline-none
              text-[var(--text-primary)] text-sm
              placeholder:text-[var(--text-muted)]
            "
          />
          <button
            type="submit"
            disabled={!pane.input.trim()}
            className="
              text-[var(--text-secondary)] hover:text-[var(--text-primary)]
              disabled:text-[var(--text-muted)]
              transition-colors text-xs
            "
          >
            send
          </button>
        </div>
      </form>
    </div>
  );
}
