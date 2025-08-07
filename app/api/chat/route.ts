import { NextRequest, NextResponse } from 'next/server'

// Helper function to truncate contract text for chat context
function truncateForChat(text: string, maxLength: number = 15000): string {
  if (text.length <= maxLength) return text
  
  // Take first part and last part to maintain context
  const firstPart = text.substring(0, maxLength * 0.7)
  const lastPart = text.substring(text.length - maxLength * 0.3)
  
  return firstPart + '\n\n[... middle section truncated ...]\n\n' + lastPart
}

export async function POST(request: NextRequest) {
  try {
    const { messages, contractText } = await request.json()

    console.log('Chat - Original contract text length:', contractText?.length || 0)
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Truncate contract text to avoid token limits
    const truncatedContract = contractText ? truncateForChat(contractText) : ''
    console.log('Chat - Truncated contract text length:', truncatedContract.length)

    // Get the last user message
    const lastMessage = messages[messages.length - 1]?.content || ''

    // Prepare messages for OpenAI with very explicit instructions for highlighting
    const openaiMessages = [
      {
        role: 'system',
        content: `You are a legal contract analysis assistant. You help users understand contract terms and provisions based on the specific contract content provided.

CRITICAL HIGHLIGHTING INSTRUCTIONS:
When you reference specific text from the contract, you MUST wrap the exact text in these markers: <<HIGHLIGHT>>exact text<<HIGHLIGHT>>

EXAMPLE:
User: "What are the payment terms?"
Your response: "The contract specifies payment terms as follows: <<HIGHLIGHT>>Payment shall be made within thirty (30) days of invoice date<<HIGHLIGHT>>. This means you have 30 days to pay after receiving an invoice."

RULES:
1. Use <<HIGHLIGHT>> markers around ANY text you quote from the contract
2. Use the EXACT wording from the contract - don't paraphrase within the markers
3. You can use multiple highlight markers in one response
4. Always use these markers when referencing specific contract language

Contract content:
${truncatedContract}`
      },
      {
        role: 'user',
        content: lastMessage
      }
    ]

    console.log('Making OpenAI chat request...')

    // Make direct HTTP call to OpenAI API for streaming
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: openaiMessages,
        max_tokens: 1000,
        temperature: 0.1,
        stream: true
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API Error:', openaiResponse.status, errorData)
      
      // If quota error, return helpful message
      if (openaiResponse.status === 429) {
        return NextResponse.json({
          error: 'OpenAI quota exceeded. Please check your OpenAI billing.',
          details: errorData
        }, { status: 429 })
      }
      
      throw new Error(`OpenAI API Error: ${openaiResponse.status} - ${errorData}`)
    }

    // Create a readable stream to forward the OpenAI response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                
                if (data === '[DONE]') {
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices[0]?.delta?.content
                  
                  if (content) {
                    // Format as AI SDK compatible stream
                    const streamData = `0:${JSON.stringify({ content })}\n`
                    controller.enqueue(new TextEncoder().encode(streamData))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in chat:', error)
    
    return NextResponse.json(
      { 
        error: 'Error processing chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
