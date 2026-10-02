import ConversationsEmptySkeleton from "@/components/skeletons/ConversationsEmptySkeleton";

// La lista y el TopBar viven en conversations/layout.tsx (no se re-montan):
// aca solo el panel derecho.
export default function Loading() {
  return <ConversationsEmptySkeleton />;
}
