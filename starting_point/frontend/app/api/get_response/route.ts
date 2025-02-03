import OpenAI from 'openai'
import { MODEL } from '@/lib/constants'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  const { messages } = await request.json()

  console.log('Incoming messages', messages)

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: messages,
      temperature: 0.7,
    })

    const response = completion.choices[0].message

    return new Response(JSON.stringify({
      role: response.role,
      content: response.content
    }))
  } catch (error: any) {
    console.error('Error in POST handler:', error)
    const errorMessage = error.response?.data?.error?.message || error.message
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: error.status || 500
    })
  }
}
