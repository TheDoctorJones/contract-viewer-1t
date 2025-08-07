'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Loader2, X } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  file: File | null
  onHighlight: (highlights: any[]) => void
  onQuery?: () => void
  onCloseChat?: () => void
}

// Function to find exact text matches in the contract for highlighting with better page detection
function findExactTextHighlights(contractText: string, exactTexts: string[]): Array<{
  id: string
  pageNumber: number
  text: string
  bounds: { x: number; y: number; width: number; height: number }
}> {
  const highlights: Array<{
    id: string
    pageNumber: number
    text: string
    bounds: { x: number; y: number; width: number; height: number }
  }> = []

  console.log('=== HIGHLIGHT GENERATION ===')
  console.log('Contract text length:', contractText.length)
  console.log('Texts to highlight:', exactTexts)

  exactTexts.forEach((exactText, index) => {
    if (exactText.length < 5) {
      console.log(`Skipping short text: "${exactText}"`)
      return
    }
    
    // Clean the text for better matching
    const cleanExactText = exactText.trim().replace(/\s+/g, ' ')
    const cleanContractText = contractText.replace(/\s+/g, ' ')
    
    console.log(`Searching for: "${cleanExactText}"`)
    
    // Find all occurrences of this exact text
    let searchIndex = 0
    while (true) {
      const foundIndex = cleanContractText.toLowerCase().indexOf(cleanExactText.toLowerCase(), searchIndex)
      if (foundIndex === -1) {
        console.log(`No match found for: "${cleanExactText}"`)
        break
      }
      
      // Better page number detection
      const textBeforeMatch = contractText.substring(0, foundIndex)
      const pageMatches = textBeforeMatch.match(/--- PAGE (\d+) ---/g)
      let pageNumber = 1
      
      if (pageMatches && pageMatches.length > 0) {
        const lastPageMatch = pageMatches[pageMatches.length - 1]
        const pageNumMatch = lastPageMatch.match(/--- PAGE (\d+) ---/)
        if (pageNumMatch) {
          pageNumber = parseInt(pageNumMatch[1])
        }
      }
      
      console.log(`Found text "${cleanExactText.substring(0, 50)}..." on page ${pageNumber}`)
      
      highlights.push({
        id: `exact-highlight-${index}-${foundIndex}`,
        pageNumber: pageNumber,
        text: cleanExactText,
        bounds: {
          x: 50,
          y: 100,
          width: cleanExactText.length * 6,
          height: 16
        }
      })
      
      searchIndex = foundIndex + cleanExactText.length
      break // Only highlight first occurrence to avoid duplicates
    }
  })

  console.log('Generated highlights:', highlights)
  return highlights
}

// Fallback function to extract key phrases from AI response for highlighting
function extractKeyPhrasesForHighlighting(response: string, question: string): string[] {
  const phrases: string[] = []
  
  // Look for quoted text (even without our markers)
  const quotedTextRegex = /"([^"]+)"/g
  let match
  while ((match = quotedTextRegex.exec(response)) !== null) {
    if (match[1].length > 10) {
      phrases.push(match[1])
    }
  }
  
  // Look for specific contract terms based on the question
  const questionLower = question.toLowerCase()
  const responseLower = response.toLowerCase()
  
  if (questionLower.includes('payment') || questionLower.includes('pay')) {
    // Look for payment-related phrases
    const paymentPatterns = [
      /payment[^.]*?(\d+)\s*days?[^.]*/gi,
      /net\s*\d+[^.]*/gi,
      /invoice[^.]*?[^.]*/gi,
      /billing[^.]*?[^.]*/gi
    ]
    
    paymentPatterns.forEach(pattern => {
      const matches = response.match(pattern)
      if (matches) {
        phrases.push(...matches.filter(m => m.length > 10))
      }
    })
  }
  
  if (questionLower.includes('termination') || questionLower.includes('terminate')) {
    // Look for termination-related phrases
    const terminationPatterns = [
      /termination[^.]*?(\d+)\s*days?[^.]*/gi,
      /notice[^.]*?termination[^.]*/gi,
      /either party[^.]*?terminate[^.]*/gi
    ]
    
    terminationPatterns.forEach(pattern => {
      const matches = response.match(pattern)
      if (matches) {
        phrases.push(...matches.filter(m => m.length > 10))
      }
    })
  }
  
  if (questionLower.includes('value') || questionLower.includes('amount') || questionLower.includes('cost')) {
    // Look for monetary amounts
    const amountPattern = /\$[\d,]+(?:\.\d{2})?/g
    const amounts = response.match(amountPattern)
    if (amounts) {
      phrases.push(...amounts)
    }
  }
  
  console.log('Extracted key phrases for highlighting:', phrases)
  return phrases
}

export function ChatInterface({ file, onHighlight, onQuery, onCloseChat }: ChatInterfaceProps) {
  const [contractText, setContractText] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMessagesVisible, setIsMessagesVisible] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Extract contract text when file changes
  useEffect(() => {
    if (file) {
      import('@/utils/pdf-text-extractor').then(({ extractTextFromPDF }) => {
        extractTextFromPDF(file).then(text => {
          setContractText(text)
          console.log('Contract text loaded, length:', text.length)
          console.log('Page markers found:', (text.match(/--- PAGE \d+ ---/g) || []).length)
        }).catch(console.error)
      })
    } else {
      setContractText('')
      setMessages([])
    }
  }, [file])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && isMessagesVisible) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMessagesVisible])

  // Show messages when a new message is added
  useEffect(() => {
    if (messages.length > 0) {
      setIsMessagesVisible(true)
    }
  }, [messages.length])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || !contractText || isLoading) return

    // Show messages area when submitting a query
    setIsMessagesVisible(true)
    onQuery?.()

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    const currentQuestion = input // Store the question for highlighting context
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Use the real OpenAI chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          contractText: contractText
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('No response stream')
      }

      let assistantContent = ''
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      }

      // Add the assistant message to show it's typing
      setMessages(prev => [...prev, assistantMessage])

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const data = JSON.parse(line.slice(2))
                if (data.content) {
                  assistantContent += data.content
                  
                  // Update the assistant message in real-time
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  ))
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError)
      }

      console.log('=== AI RESPONSE ANALYSIS ===')
      console.log('Full AI response:', assistantContent)

      // Extract highlighted text from the AI response with improved regex
      const exactTextsToHighlight: string[] = []
      
      // Try multiple highlight patterns to handle malformed markers
      const highlightPatterns = [
        /<<HIGHLIGHT>>(.*?)<<HIGHLIGHT>>/g,  // Perfect format
        /<<HIGHLIGHT>>(.*?)(?=<<HIGHLIGHT|$)/g,  // Missing closing marker
        /<<HIGHLIGHT([^>]*?)>>(.*?)<<HIGHLIGHT>>/g,  // Extra content in opening
        /"([^"]*\$[^"]*?)"/g  // Quoted monetary amounts as fallback
      ]
      
      for (const pattern of highlightPatterns) {
        let match
        while ((match = pattern.exec(assistantContent)) !== null) {
          const textToHighlight = match[1] || match[2] // Handle different capture groups
          if (textToHighlight && textToHighlight.length > 3) {
            exactTextsToHighlight.push(textToHighlight.trim())
          }
        }
      }

      console.log('Extracted texts to highlight:', exactTextsToHighlight)

      // If no explicit highlights, try to extract key phrases
      if (exactTextsToHighlight.length === 0) {
        console.log('No explicit highlights found, trying fallback extraction...')
        const fallbackPhrases = extractKeyPhrasesForHighlighting(assistantContent, currentQuestion)
        exactTextsToHighlight.push(...fallbackPhrases)
      }

      // Clean up the display text by removing all highlight markers
      const cleanContent = assistantContent
        .replace(/<<HIGHLIGHT>>/g, '"')
        .replace(/<<HIGHLIGHT[^>]*?>>/g, '"')
        .replace(/<<HIGHLIGHT/g, '"')
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: cleanContent }
          : msg
      ))

      // Highlight only the exact text passages the AI referenced
      if (exactTextsToHighlight.length > 0 && contractText) {
        const highlights = findExactTextHighlights(contractText, exactTextsToHighlight)
        console.log('Final highlights to display:', highlights)
        onHighlight(highlights)
      } else {
        console.log('No highlights generated, clearing highlights')
        // Clear highlights if no specific text was referenced
        onHighlight([])
      }

    } catch (error) {
      console.error('Error in chat:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleInputFocus = () => {
    // Show messages when user clicks into the input field (if there are messages to show)
    if (messages.length > 0 && !isMessagesVisible) {
      setIsMessagesVisible(true)
    }
  }

  const handleCloseMessages = () => {
    setIsMessagesVisible(false)
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      {/* Messages Area - Only show when there are messages AND isMessagesVisible is true */}
      {messages.length > 0 && isMessagesVisible && (
        <div className="relative">
          {/* Close Button - Only show when messages are visible */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseMessages}
            className="absolute top-2 right-2 z-10 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
          
          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="max-h-80 overflow-y-auto p-4 border-b border-gray-200 pt-8"
          >
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.content || (message.role === 'assistant' && isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Analyzing contract...</span>
                      </div>
                    ) : message.content)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Input - Always visible */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={file ? "Ask about the contract..." : "Upload a contract first"}
            disabled={!file || isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!input.trim() || !file || isLoading}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
