import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let debugInfo = {
    hasApiKey: !!process.env.OPENAI_API_KEY,
    apiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    apiKeyStartsWith: process.env.OPENAI_API_KEY?.startsWith('sk-') || false,
    apiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 20) || 'MISSING',
    timestamp: new Date().toISOString()
  }

  try {
    const { contractText, agreementType } = await request.json()

    if (!contractText) {
      return NextResponse.json({ error: 'Contract text is required' }, { status: 400 })
    }

    console.log('=== API KEY VERIFICATION ===')
    console.log('API Key Debug:', debugInfo)
    console.log('Contract length:', contractText.length)

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        debugInfo
      }, { status: 500 })
    }

    // Extract attributes using targeted questions (like the chat does)
    const attributes = await extractAllAttributes(contractText)
    
    // Get summary and agreement type
    const summaryAndType = await getSummaryAndType(contractText)
    
    console.log('Extracted attributes:', attributes)
    console.log('Summary and type:', summaryAndType)
    
    return NextResponse.json({
      summary: summaryAndType.summary,
      detectedType: summaryAndType.agreementType,
      attributes: attributes,
      apiKeyUsed: process.env.OPENAI_API_KEY.substring(0, 20) + '...'
    })

  } catch (error) {
    const errorDetails = {
      type: 'UNEXPECTED_ERROR',
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
    
    console.log('Unexpected error:', errorDetails)
    
    return NextResponse.json({ 
      error: 'Unexpected error during analysis',
      errorDetails,
      debugInfo
    }, { status: 500 })
  }
}

// Clean and format attribute values to be concise
function cleanAttributeValue(attribute: string, rawValue: string): string {
  if (!rawValue || rawValue.toLowerCase().includes('not found')) {
    return 'Not specified'
  }

  const value = rawValue.trim()
  
  switch (attribute) {
    case 'Contract Value':
      return cleanContractValue(value)
    
    case 'Term Length':
      return cleanTermLength(value)
    
    case 'Termination Notice Period':
      return cleanNoticePeriod(value)
    
    case 'Payment Terms':
      return cleanPaymentTerms(value)
    
    case 'Governing Law':
      return cleanGoverningLaw(value)
    
    case 'Liability Cap':
      return cleanLiabilityCap(value)
    
    case 'Confidentiality Period':
      return cleanConfidentialityPeriod(value)
    
    case 'Effective Date':
    case 'Expiration Date':
      return cleanDate(value)
    
    case 'Party 1':
    case 'Party 2':
      return cleanPartyName(value)
    
    case 'Jurisdiction':
      return cleanJurisdiction(value)
    
    case 'Force Majeure':
      return cleanForcemajeure(value)
    
    case 'Amendment Process':
      return cleanAmendmentProcess(value)
    
    case 'Renewal Terms':
      return cleanRenewalTerms(value)
    
    default:
      return value.length > 100 ? value.substring(0, 100) + '...' : value
  }
}

function cleanContractValue(value: string): string {
  // Extract dollar amounts
  const dollarMatch = value.match(/\$[\d,]+(?:\.\d{2})?/)
  if (dollarMatch) {
    return dollarMatch[0]
  }
  
  // Extract other monetary formats
  const numberMatch = value.match(/([\d,]+(?:\.\d{2})?)\s*(?:dollars?|usd)/i)
  if (numberMatch) {
    return `$${numberMatch[1]}`
  }
  
  return value
}

function cleanTermLength(value: string): string {
  // Extract date ranges and calculate duration
  const dateRangeMatch = value.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december),?\s+\d{4})\s+to\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december),?\s+\d{4})/i)
  
  if (dateRangeMatch) {
    try {
      const startDate = new Date(dateRangeMatch[1])
      const endDate = new Date(dateRangeMatch[2])
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const diffMonths = Math.round(diffDays / 30)
      
      if (diffMonths >= 12) {
        const years = Math.round(diffMonths / 12)
        return years === 1 ? '1 year' : `${years} years`
      } else if (diffMonths >= 1) {
        return diffMonths === 1 ? '1 month' : `${diffMonths} months`
      } else {
        return `${diffDays} days`
      }
    } catch (e) {
      // Fall through to other patterns
    }
  }
  
  // Extract explicit duration statements
  const durationMatch = value.match(/(\d+)\s*(months?|years?|days?)/i)
  if (durationMatch) {
    const num = durationMatch[1]
    const unit = durationMatch[2].toLowerCase()
    return `${num} ${unit}`
  }
  
  // Extract written numbers
  const writtenMatch = value.match(/(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(months?|years?)/i)
  if (writtenMatch) {
    const writtenToNum: Record<string, string> = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6',
      'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 'eleven': '11', 'twelve': '12'
    }
    const num = writtenToNum[writtenMatch[1].toLowerCase()] || writtenMatch[1]
    const unit = writtenMatch[2].toLowerCase()
    return `${num} ${unit}`
  }
  
  return value
}

function cleanNoticePeriod(value: string): string {
  // Extract number and days/months
  const periodMatch = value.match(/(\d+)\s*(?:$$\d+$$)?\s*(days?|months?)/i)
  if (periodMatch) {
    return `${periodMatch[1]} ${periodMatch[2].toLowerCase()}`
  }
  
  // Extract written numbers
  const writtenMatch = value.match(/(fifteen|thirty|sixty|ninety|seven|fourteen|7|14|15|30|60|90)\s*(?:$$\d+$$)?\s*(days?|months?)/i)
  if (writtenMatch) {
    const writtenToNum: Record<string, string> = {
      'seven': '7', 'fourteen': '14', 'fifteen': '15', 'thirty': '30', 'sixty': '60', 'ninety': '90'
    }
    const num = writtenToNum[writtenMatch[1].toLowerCase()] || writtenMatch[1]
    return `${num} ${writtenMatch[2].toLowerCase()}`
  }
  
  return value
}

function cleanPaymentTerms(value: string): string {
  // Extract net terms
  const netMatch = value.match(/net\s*(\d+)/i)
  if (netMatch) {
    return `Net ${netMatch[1]} days`
  }
  
  // Extract common payment terms
  if (value.toLowerCase().includes('upon receipt')) return 'Upon receipt'
  if (value.toLowerCase().includes('monthly')) return 'Monthly'
  if (value.toLowerCase().includes('quarterly')) return 'Quarterly'
  if (value.toLowerCase().includes('weekly')) return 'Weekly'
  if (value.toLowerCase().includes('annually')) return 'Annually'
  
  // Extract "due within X days"
  const dueMatch = value.match(/due\s+within\s+(\d+)\s+days?/i)
  if (dueMatch) {
    return `Due within ${dueMatch[1]} days`
  }
  
  return value.length > 50 ? value.substring(0, 50) + '...' : value
}

function cleanGoverningLaw(value: string): string {
  // Extract state names
  const stateMatch = value.match(/(?:state\s+of\s+)?([a-z\s]+?)(?:\s+law|\s+shall|\s+govern|$)/i)
  if (stateMatch) {
    const state = stateMatch[1].trim()
    return state.charAt(0).toUpperCase() + state.slice(1).toLowerCase()
  }
  
  return value
}

function cleanLiabilityCap(value: string): string {
  // Extract dollar amounts
  const dollarMatch = value.match(/\$[\d,]+(?:\.\d{2})?/)
  if (dollarMatch) {
    return `Limited to ${dollarMatch[0]}`
  }
  
  // Check for exclusions/limitations
  if (value.toLowerCase().includes('excluded') || value.toLowerCase().includes('disclaimed')) {
    return 'Excluded'
  }
  if (value.toLowerCase().includes('limited')) {
    return 'Limited'
  }
  
  return value.length > 50 ? value.substring(0, 50) + '...' : value
}

function cleanConfidentialityPeriod(value: string): string {
  // Extract years
  const yearMatch = value.match(/(\d+)\s*years?/i)
  if (yearMatch) {
    return `${yearMatch[1]} years`
  }
  
  // Extract months
  const monthMatch = value.match(/(\d+)\s*months?/i)
  if (monthMatch) {
    return `${monthMatch[1]} months`
  }
  
  // Check for indefinite/perpetual
  if (value.toLowerCase().includes('indefinite') || value.toLowerCase().includes('perpetual')) {
    return 'Indefinite'
  }
  
  return value.length > 50 ? value.substring(0, 50) + '...' : value
}

function cleanDate(value: string): string {
  // Extract dates in various formats
  const dateMatch = value.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december),?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i)
  if (dateMatch) {
    return dateMatch[1]
  }
  
  return value
}

function cleanPartyName(value: string): string {
  // Extract company names (remove extra descriptive text)
  const companyMatch = value.match(/([A-Z][a-zA-Z\s&.,-]*(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Ltd\.?|Limited|LP|LLP))/i)
  if (companyMatch) {
    return companyMatch[1].trim()
  }
  
  // Remove common prefixes
  const cleaned = value.replace(/^(?:the\s+)?(?:first|second|primary|main)\s+(?:contracting\s+)?party\s+is\s+/i, '')
  return cleaned.length > 60 ? cleaned.substring(0, 60) + '...' : cleaned
}

function cleanJurisdiction(value: string): string {
  // Extract location/state
  const locationMatch = value.match(/(?:courts?\s+of\s+|in\s+)([^,.]+)/i)
  if (locationMatch) {
    return locationMatch[1].trim()
  }
  
  return value.length > 50 ? value.substring(0, 50) + '...' : value
}

function cleanForcemajeure(value: string): string {
  if (value.toLowerCase().includes('yes') || value.toLowerCase().includes('included') || value.toLowerCase().includes('provision')) {
    return 'Included'
  }
  if (value.toLowerCase().includes('no') || value.toLowerCase().includes('not found')) {
    return 'Not included'
  }
  
  return value.length > 50 ? value.substring(0, 50) + '...' : value
}

function cleanAmendmentProcess(value: string): string {
  // Extract key requirements
  if (value.toLowerCase().includes('written') && value.toLowerCase().includes('both parties')) {
    return 'Written agreement by both parties'
  }
  if (value.toLowerCase().includes('written')) {
    return 'Written amendment required'
  }
  if (value.toLowerCase().includes('mutual')) {
    return 'Mutual agreement required'
  }
  
  return value.length > 60 ? value.substring(0, 60) + '...' : value
}

function cleanRenewalTerms(value: string): string {
  if (value.toLowerCase().includes('automatic')) {
    // Extract renewal period
    const periodMatch = value.match(/(\d+)\s*(months?|years?)/i)
    if (periodMatch) {
      return `Automatic (${periodMatch[1]} ${periodMatch[2]})`
    }
    return 'Automatic renewal'
  }
  
  if (value.toLowerCase().includes('manual') || value.toLowerCase().includes('option')) {
    return 'Manual renewal'
  }
  
  return value.length > 50 ? value.substring(0, 50) + '...' : value
}

// Extract each attribute using targeted questions with concise response instructions
async function extractAllAttributes(contractText: string): Promise<Record<string, string>> {
  const attributes: Record<string, string> = {}
  
  // Define targeted questions for each attribute with specific formatting instructions
  const attributeQuestions = [
    {
      attribute: 'Contract Value',
      question: 'What is the total contract value or fee amount? Respond with just the dollar amount (e.g., "$50,000" or "$1,500.00"). If multiple amounts, provide the total or largest amount.'
    },
    {
      attribute: 'Term Length', 
      question: 'What is the duration of this contract? If you see specific start and end dates, calculate the duration. Respond with just the duration (e.g., "6 months", "1 year", "2 years").'
    },
    {
      attribute: 'Termination Notice Period',
      question: 'How much advance notice is required to terminate this contract? Respond with just the notice period (e.g., "30 days", "60 days", "15 days").'
    },
    {
      attribute: 'Governing Law',
      question: 'Which state or jurisdiction governs this contract? Respond with just the state name (e.g., "California", "Delaware", "New York").'
    },
    {
      attribute: 'Payment Terms',
      question: 'What are the payment terms? Respond concisely (e.g., "Net 30 days", "Monthly", "Upon receipt", "Quarterly").'
    },
    {
      attribute: 'Renewal Terms',
      question: 'How does this contract renew? Respond concisely (e.g., "Automatic renewal", "Manual renewal", "No renewal clause").'
    },
    {
      attribute: 'Liability Cap',
      question: 'What are the liability limitations? Respond concisely (e.g., "Limited to $100,000", "Excluded", "No limitation").'
    },
    {
      attribute: 'Confidentiality Period',
      question: 'How long do confidentiality obligations last? Respond with just the duration (e.g., "5 years", "Indefinite", "3 years").'
    },
    {
      attribute: 'Effective Date',
      question: 'When does this contract become effective? Respond with just the date (e.g., "July 28, 2025", "01/15/2024").'
    },
    {
      attribute: 'Expiration Date',
      question: 'When does this contract end? Respond with just the date (e.g., "January 31, 2026", "12/31/2024").'
    },
    {
      attribute: 'Party 1',
      question: 'What is the name of the first contracting party? Respond with just the company/entity name.'
    },
    {
      attribute: 'Party 2', 
      question: 'What is the name of the second contracting party? Respond with just the company/entity name.'
    },
    {
      attribute: 'Jurisdiction',
      question: 'Where will disputes be resolved? Respond with just the location (e.g., "California courts", "Delaware", "New York").'
    },
    {
      attribute: 'Force Majeure',
      question: 'Are there force majeure provisions in this contract? Respond with "Included" or "Not included".'
    },
    {
      attribute: 'Amendment Process',
      question: 'How can this contract be amended? Respond concisely (e.g., "Written agreement required", "Mutual consent", "No amendment clause").'
    }
  ]

  // Process each attribute with targeted questions
  for (const { attribute, question } of attributeQuestions) {
    try {
      console.log(`Extracting ${attribute}...`)
      const rawValue = await askTargetedQuestion(contractText, question)
      const cleanedValue = cleanAttributeValue(attribute, rawValue || '')
      attributes[attribute] = cleanedValue
      console.log(`${attribute}: ${attributes[attribute]}`)
    } catch (error) {
      console.error(`Error extracting ${attribute}:`, error)
      attributes[attribute] = 'Not specified'
    }
  }

  return attributes
}

// Ask a targeted question about the contract (same approach as chat)
async function askTargetedQuestion(contractText: string, question: string): Promise<string | null> {
  const prompt = `Based on this contract, answer the following question. Be concise and specific. If the information is not found, respond with "Not found".

CONTRACT:
${contractText.substring(0, 10000)}

QUESTION: ${question}

ANSWER:`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100, // Reduced for more concise responses
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status)
      return null
    }

    const data = await response.json()
    const answer = data.choices[0]?.message?.content?.trim()
    
    if (!answer || answer.toLowerCase().includes('not found') || answer.toLowerCase().includes('not specified')) {
      return null
    }
    
    return answer
  } catch (error) {
    console.error('Error in targeted question:', error)
    return null
  }
}

// Get summary and agreement type with much more focused instructions
async function getSummaryAndType(contractText: string): Promise<{summary: string, agreementType: string}> {
  const prompt = `Analyze this contract and provide a VERY concise summary. Focus ONLY on the most specific, actionable information:

1. What type of agreement is this?
2. Who are the parties?
3. What is the main purpose/service/product?
4. Any key financial terms or dates?

DO NOT include generic phrases like "outlines the scope", "establishes terms", "includes provisions for", etc.
BE SPECIFIC. Focus on the unique details that matter.

Example good summary: "Statement of Work between DocuSign Inc. and Jade Global Inc. for Subscription Management services related to IAM Enterprise Plus Platform. $45,000 total value, 6-month term ending December 2024."

Example bad summary: "The contract outlines the scope of services, consulting fees, confidentiality, project context, and establishes terms between the parties."

CONTRACT:
${contractText.substring(0, 8000)}

Respond in this format:
SUMMARY: [your concise, specific summary - max 2 sentences]
TYPE: [agreement type]`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200, // Reduced for more concise responses
        temperature: 0.1
      })
    })

    if (!response.ok) {
      return {
        summary: 'Contract analysis completed',
        agreementType: 'Services Agreement'
      }
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content?.trim() || ''
    
    const summaryMatch = content.match(/SUMMARY:\s*(.+?)(?=TYPE:|$)/s)
    const typeMatch = content.match(/TYPE:\s*(.+?)$/s)
    
    return {
      summary: summaryMatch?.[1]?.trim() || 'Contract analysis completed',
      agreementType: typeMatch?.[1]?.trim() || 'Services Agreement'
    }
  } catch (error) {
    console.error('Error getting summary and type:', error)
    return {
      summary: 'Contract analysis completed',
      agreementType: 'Services Agreement'
    }
  }
}
