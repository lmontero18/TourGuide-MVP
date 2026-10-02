import ChatSkeleton from "@/components/chat/ChatSkeleton";

// Solo el panel del chat: la lista vive en conversations/layout.tsx.
export default function Loading() {
  return <ChatSkeleton />;
}
