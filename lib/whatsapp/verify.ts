import { createHmac } from 'crypto'

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  const expectedSignature =
    'sha256=' +
    createHmac('sha256', appSecret).update(payload).digest('hex')

  return expectedSignature === signature
}
