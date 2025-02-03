import { handleChat } from '@/lib/openai-pipeline'

export async function POST(request: Request) {
  const { messages } = await request.json()

  console.log('Incoming messages', messages)

  try {
    const response = await handleChat(messages)
    console.log('Assistant response (raw):', response)
    
    const responseObj = {
      role: 'assistant',
      content: response
    }
    console.log('Final response object:', responseObj)
    
    return new Response(JSON.stringify(responseObj))
  } catch (error: any) {
    console.error('Error in POST handler:', error)
    const errorMessage = error.response?.data?.error?.message || error.message
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error.status || 500
    })
  }
}
