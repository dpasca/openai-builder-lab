import { SYSTEM_PROMPT } from './constants'
import useConversationStore from '@/stores/useConversationStore'

type MessageRole = 'user' | 'assistant' | 'system' | 'function'

export interface MessageItem {
  type: 'message'
  role: MessageRole
  content: string
  name?: string
}

export interface FunctionCallItem {
  type: 'function_call'
  status: 'in_progress' | 'completed' | 'failed'
  id: string
  name: string
  arguments: string
  parsedArguments: any
  output: string | null
}

export type Item = MessageItem | FunctionCallItem

export const handleTurn = async (): Promise<void> => {
  const {
    chatMessages,
    setChatMessages,
  } = useConversationStore.getState()

  // Convert messages for the API
  const messages = chatMessages
    .filter((item): item is MessageItem => item.type === 'message')
    .map(({ role, content, name }) => ({ role, content, name }))

  try {
    const response = await fetch('/api/get_response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages })
    })

    if (!response.ok) {
      console.error(`Error: ${response.statusText}`)
      return
    }

    const data = await response.json()
    console.log('Response from API:', data)

    if (data.content) {
      const messageItem: MessageItem = {
        type: 'message',
        role: data.role as MessageRole,
        content: data.content
      }

      // Update chat messages
      chatMessages.push(messageItem)
      setChatMessages([...chatMessages])
    }
  } catch (error) {
    console.error('Error processing messages:', error)
  }
}
