'use client';

import { useState, useRef, useEffect } from 'react';
import { FloorPlan } from '@/lib/types';
import { ChatMessage, modifyFloorPlan } from '@/lib/ai';

interface ChatPanelProps {
  floorPlan: FloorPlan;
  onFloorPlanUpdate: (plan: FloorPlan) => void;
}

export default function ChatPanel({ floorPlan, onFloorPlanUpdate }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const updatedPlan = await modifyFloorPlan(floorPlan, userMessage, messages);
      onFloorPlanUpdate(updatedPlan);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Done! I\'ve updated the floor plan.' },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to modify plan';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${errMsg}. Try rephrasing your request.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 left-4 z-20 bg-gradient-to-r from-accent-primary to-accent-secondary text-white px-4 py-2.5 rounded-xl font-body text-sm shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 hover:scale-[1.02] transition-all flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Modify Design
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-20 w-96 h-[420px] bg-bg-secondary/95 backdrop-blur-md border border-border-custom rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
          <span className="font-display text-accent-primary text-xs tracking-wide">AI Design Chat</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-text-secondary hover:text-text-primary transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-secondary/60 text-xs font-body mb-3">
              Describe changes to your floor plan
            </p>
            <div className="space-y-1.5">
              {[
                'Make the living room bigger',
                'Add a balcony to bedroom 1',
                'Swap the kitchen and bathroom',
                'Add more windows',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="block w-full text-left px-3 py-1.5 text-xs text-text-secondary bg-bg-card/50 rounded-lg hover:bg-bg-card hover:text-text-primary transition-all font-body"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-xs font-body ${
                msg.role === 'user'
                  ? 'bg-accent-primary/20 text-text-primary rounded-br-sm'
                  : 'bg-bg-card text-text-secondary rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-bg-card px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 py-3 border-t border-border-custom">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Make bedroom 1 larger..."
            disabled={isLoading}
            className="flex-1 bg-bg-primary/60 border border-border-custom rounded-lg px-3 py-2 text-xs text-text-primary placeholder-text-secondary/40 font-body focus:outline-none focus:ring-1 focus:ring-accent-primary/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-accent-primary text-bg-primary rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-accent-primary/90 transition-all"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
