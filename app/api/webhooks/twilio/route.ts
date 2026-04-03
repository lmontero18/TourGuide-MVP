import { NextResponse } from 'next/server'

export async function POST() {
  // TODO: validate Twilio signature
  // TODO: identify org by To number
  // TODO: insert message
  // TODO: handle conversation status routing
  return new NextResponse('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
