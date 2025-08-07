import { NextRequest, NextResponse } from 'next/server'

// Enhanced demo chat API that analyzes the actual contract text
export async function POST(request: NextRequest) {
  try {
    const { messages, contractText } = await request.json()
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    let response = generateSmartChatResponse(lastMessage, contractText)

    return NextResponse.json({ 
      content: response,
      role: 'assistant'
    })

  } catch (error) {
    console.error('Error in demo chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}

function generateSmartChatResponse(question: string, contractText: string): string {
  const text = contractText.toLowerCase()
  
  if (question.includes('termination') || question.includes('terminate')) {
    // Look for actual termination clauses
    const terminationMatch = text.match(/termination[^.]*?(\d+)\s*days?[^.]*/i)
    if (terminationMatch) {
      return `According to the contract, termination requires ${terminationMatch[1]} days notice. The specific clause states: "${terminationMatch[0]}..."`
    }
    
    if (text.includes('terminate')) {
      const terminationSection = extractRelevantSection(contractText, 'termination')
      return `The contract includes termination provisions. ${terminationSection ? `Here's the relevant section: "${terminationSection.substring(0, 200)}..."` : 'Please refer to the termination section for specific details.'}`
    }
    
    return 'I don\'t see specific termination clauses in this contract. You may want to review the document for termination terms.'
  }
  
  if (question.includes('payment') || question.includes('pay')) {
    // Look for payment terms
    const paymentMatch = text.match(/payment[^.]*?(net \d+|upon receipt|monthly|quarterly)[^.]*/i)
    if (paymentMatch) {
      return `The contract specifies payment terms as: "${paymentMatch[0]}..."`
    }
    
    const amountMatch = text.match(/\$[\d,]+(?:\.\d{2})?/)
    if (amountMatch) {
      return `The contract includes financial terms with amounts like ${amountMatch[0]}. Payment terms and conditions are specified in the compensation section.`
    }
    
    return 'I can see financial terms in the contract. Please refer to the compensation or payment section for specific details.'
  }
  
  if (question.includes('parties') || question.includes('who')) {
    const parties = extractParties(contractText)
    if (parties.length >= 2) {
      return `This contract is between ${parties[0]} and ${parties[1]}. These are the main contracting parties as identified in the agreement.`
    } else if (parties.length === 1) {
      return `I can identify ${parties[0]} as one of the contracting parties. The other party details may be referenced elsewhere in the document.`
    }
    
    return 'The contracting parties are identified in the opening section of the agreement. Please refer to the preamble for complete party information.'
  }
  
  if (question.includes('date') || question.includes('when')) {
    const dates = extractDates(contractText)
    if (dates.length > 0) {
      return `The contract references several important dates including ${dates[0]}${dates.length > 1 ? ` and ${dates[1]}` : ''}. These appear to be key dates for the agreement.`
    }
    
    return 'The contract includes various dates for effectiveness, performance, and other milestones. Please check the specific sections for detailed timing information.'
  }
  
  if (question.includes('value') || question.includes('amount') || question.includes('cost')) {
    const amounts = extractAmounts(contractText)
    if (amounts.length > 0) {
      return `The contract includes financial terms with amounts such as ${amounts.join(', ')}. These represent the monetary values associated with the agreement.`
    }
    
    return 'The contract includes financial terms and compensation details. Please refer to the compensation or payment sections for specific amounts.'
  }
  
  if (question.includes('confidential') || question.includes('nda')) {
    if (text.includes('confidential')) {
      const confidentialSection = extractRelevantSection(contractText, 'confidential')
      return `The contract includes confidentiality provisions. ${confidentialSection ? `Here's the relevant section: "${confidentialSection.substring(0, 200)}..."` : 'These terms protect sensitive information shared between the parties.'}`
    }
    
    return 'I don\'t see specific confidentiality clauses in this contract. The agreement may handle confidentiality through other provisions.'
  }
  
  // Default response with contract-specific information
  const contractType = detectContractType(contractText)
  return `This appears to be a ${contractType}. I can help you understand specific provisions. Could you ask about a particular section like payments, termination, or responsibilities?`
}

// Helper functions
function extractParties(text: string): string[] {
  const parties = []
  const companyRegex = /([A-Z][a-zA-Z\s&]+(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Ltd\.?))/g
  const matches = text.match(companyRegex)
  
  if (matches) {
    const uniqueParties = [...new Set(matches)]
    parties.push(...uniqueParties.slice(0, 2))
  }
  
  return parties
}

function extractDates(text: string): string[] {
  const dateRegex = /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}/gi
  return text.match(dateRegex) || []
}

function extractAmounts(text: string): string[] {
  const amountRegex = /\$[\d,]+(?:\.\d{2})?/g
  return text.match(amountRegex) || []
}

function extractRelevantSection(text: string, keyword: string): string | null {
  const regex = new RegExp(`[^.]*${keyword}[^.]*\.`, 'i')
  const match = text.match(regex)
  return match ? match[0] : null
}

function detectContractType(text: string): string {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('master service agreement')) return 'Master Service Agreement'
  if (lowerText.includes('non-disclosure agreement')) return 'Non-Disclosure Agreement'
  if (lowerText.includes('employment agreement')) return 'Employment Agreement'
  if (lowerText.includes('consulting agreement')) return 'Consulting Agreement'
  if (lowerText.includes('license agreement')) return 'License Agreement'
  
  return 'contract'
}
