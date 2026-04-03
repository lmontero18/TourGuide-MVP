"use client";

import ConversationList from "@/components/conversations/ConversationList";
import TopBar from "@/components/layout/TopBar";

export default function ConversationsPage() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Conversations" />
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className="w-full max-w-md border-r border-slate-200 bg-white overflow-hidden">
          <ConversationList />
        </div>

        {/* Empty state — no conversation selected */}
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="font-display text-lg font-bold text-navy-900">Select a conversation</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              Choose a conversation from the list to view messages and take control from the bot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
