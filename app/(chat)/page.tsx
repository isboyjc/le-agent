import { ChatBox } from '@/components/chat-box'
import { generateUUID } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default function ChatPage() {
  const id = generateUUID()
  return <ChatBox threadId={id} initialMessages={[]} key={id} />
}
