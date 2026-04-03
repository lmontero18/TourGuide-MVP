// TODO: implement with Supabase client
export async function takeControl(_conversationId: string, _agentId: string): Promise<void> {
  // TODO: update conversation status to 'active' and assigned_to
}

export async function returnToBot(_conversationId: string): Promise<void> {
  // TODO: update conversation status to 'bot' and clear assigned_to
}
