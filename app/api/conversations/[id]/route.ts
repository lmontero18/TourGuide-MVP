import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // TODO: fetch conversation by id
  return NextResponse.json({ id, message: 'TODO: implement' })
}
