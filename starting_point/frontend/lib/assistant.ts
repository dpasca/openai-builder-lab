import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT } from './constants'
import useConversationStore from '@/stores/useConversationStore'
import { handleTool } from './tools'
import { v4 as uuidv4 } from 'uuid'

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

const convertToOpenAIMessage = (message: MessageItem): ChatCompletionMessageParam => {
  const base = { role: message.role, content: message.content }
  return message.name ? { ...base, name: message.name } : base
}

export const handleTurn = async (): Promise<void> => {
  const {
    chatMessages,
    conversationItems,
    setChatMessages,
    setConversationItems
  } = useConversationStore.getState()

  // Convert conversation items to OpenAI messages
  const openAIMessages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationItems
      .filter((item): item is MessageItem => item.type === 'message')
      .map(convertToOpenAIMessage)
  ]

  try {
    const response = await fetch('/api/get_response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: openAIMessages })
    })

    if (!response.ok) {
      console.error(`Error: ${response.statusText}`)
      return
    }

    const data = await response.json()

    console.log('Response', data)

    // Handle tool calls if present
    if (data.tool_calls) {
      for (const toolCall of data.tool_calls) {
        const functionCall: FunctionCallItem = {
          type: 'function_call',
          status: 'in_progress',
          id: uuidv4(),
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
          parsedArguments: JSON.parse(toolCall.function.arguments),
          output: null
        }

        // Add function call to conversation
        conversationItems.push(functionCall)
        setConversationItems([...conversationItems])

        try {
          // Execute the tool
          const result = await handleTool(
            functionCall.name,
            functionCall.parsedArguments
          )

          // Update function call with result
          functionCall.status = 'completed'
          functionCall.output = result
          setConversationItems([...conversationItems])

          // Add the function result as a message
          const functionResultMessage: MessageItem = {
            type: 'message',
            role: 'function',
            content: result,
            name: functionCall.name
          }

          // Add to conversation items
          conversationItems.push(functionResultMessage)
          setConversationItems([...conversationItems])

          // Continue the conversation with the function result
          return handleTurn()
        } catch (error: unknown) {
          functionCall.status = 'failed'
          functionCall.output = error instanceof Error ? error.message : 'Unknown error'
          setConversationItems([...conversationItems])
        }
      }
    }

    // If no tool calls or after tool execution, add the assistant's message
    if (data.content) {
      const messageItem: MessageItem = {
        type: 'message',
        role: data.role as MessageRole,
        content: data.content
      }

      // Update chat messages
      chatMessages.push(messageItem)
      setChatMessages([...chatMessages])

      // Update conversation items
      conversationItems.push(messageItem)
      setConversationItems([...conversationItems])
    }
  } catch (error) {
    console.error('Error processing messages:', error)
  }
}
