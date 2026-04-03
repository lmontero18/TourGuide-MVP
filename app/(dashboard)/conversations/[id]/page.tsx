export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div>
      <h1>Conversation {id}</h1>
      <p>TODO: implement chat view</p>
    </div>
  )
}
