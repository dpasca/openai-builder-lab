import { handleChat } from '@/lib/openai-pipeline'

export async function POST(request: Request) {
  const { messages } = await request.json()

  console.log('Incoming messages', messages)

  try {
    const response = await handleChat(messages)
    return new Response(JSON.stringify({
      role: 'assistant',
      content: response
    }))
  } catch (error: any) {
    console.error('Error in POST handler:', error)
    const errorMessage = error.response?.data?.error?.message || error.message
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error.status || 500
    })
  }
}
