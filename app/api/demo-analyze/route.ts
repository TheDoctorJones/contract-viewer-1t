import { NextRequest, NextResponse } from 'next/server'

// Enhanced demo API with detailed debugging and better text analysis
export async function POST(request: NextRequest) {
  try {
    const { contractText, agreementType } = await request.json()

    if (!contractText) {
      return NextResponse.json({ error: 'Contract text is required' }, { status: 400 })
    }

    console.log('=== CONTRACT ANALYSIS DEBUG ===')
    console.log('Contract text length:', contractText.length)
    console.log('First 300 chars:', contractText.substring(0, 300))
    console.log('Agreement type hint:', agreementType)

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Analyze the actual contract text with debugging
    const mockSummary = generateSmartSummary(contractText, agreementType)
    const mockKeyTerms = extractSmartKeyTerms(contractText)
    const mockDetectedType = detectSmartAgreementType(contractText)

    console.log('Generated summary:', mockSummary)
    console.log('Extracted key terms:', mockKeyTerms)
    console.log('Detected type:', mockDetectedType)

    return NextResponse.json({
      summary: mockSummary,
      keyTerms: mockKeyTerms,
      detectedType: mockDetectedType,
    })

  } catch (error) {
    console.error('Error in demo analysis:', error)
    return NextResponse.json(
      { error: 'Failed to analyze contract' },
      { status: 500 }
    )
  }
}

function generateSmartSummary(contractText: string, agreementType?: string): string {
  const text = contractText.toLowerCase()
  console.log('Generating summary for text length:', text.length)
  
  // Extract key information from the actual text
  const parties = extractParties(contractText) // Use original case
  const dates = extractDates(text)
  const amounts = extractAmounts(text)
  const terms = extractTerms(text)
  
  console.log('Extracted parties:', parties)
  console.log('Extracted dates:', dates)
  console.log('Extracted amounts:', amounts)
  console.log('Extracted terms:', terms)
  
  // Build summary based on actual content
  const detectedType = detectSmartAgreementType(contractText)
  let summary = `This ${detectedType} `
  
  if (parties.length >= 2) {
    summary += `is between ${parties[0]} and ${parties[1]}. `
  } else if (parties.length === 1) {
    summary += `involves ${parties[0]} as one of the contracting parties. `
  } else {
    summary += `establishes terms between the contracting parties. `
  }
  
  if (dates.length > 0) {
    summary += `The agreement references key dates including ${dates[0]}${dates.length > 1 ? ` and ${dates[1]}` : ''}. `
  }
  
  if (terms.length > 0) {
    summary += `The contract term is ${terms[0]}. `
  }
  
  if (amounts.length > 0) {
    summary += `Financial terms include ${amounts.slice(0, 2).join(' and ')}. `
  }
  
  // Add specific clauses found
  const clauses = []
  if (text.includes('confidential') || text.includes('non-disclosure')) {
    clauses.push('confidentiality provisions')
  }
  if (text.includes('termination') || text.includes('terminate')) {
    clauses.push('termination clauses')
  }
  if (text.includes('liability') || text.includes('damages')) {
    clauses.push('liability limitations')
  }
  if (text.includes('intellectual property') || text.includes('ip ')) {
    clauses.push('intellectual property terms')
  }
  if (text.includes('payment') || text.includes('compensation')) {
    clauses.push('payment terms')
  }
  
  if (clauses.length > 0) {
    summary += `Key provisions include ${clauses.join(', ')}.`
  }
  
  return summary
}

function extractSmartKeyTerms(contractText: string): Array<{ term: string; value: string }> {
  const text = contractText.toLowerCase()
  const keyTerms = []
  
  console.log('Extracting key terms from text...')
  
  // Extract contract value with more patterns
  const amounts = extractAmounts(text)
  console.log('Found amounts:', amounts)
  if (amounts.length > 0) {
    // Find the largest amount as likely contract value
    const sortedAmounts = amounts.sort((a, b) => {
      const aNum = parseFloat(a.replace(/[$,]/g, ''))
      const bNum = parseFloat(b.replace(/[$,]/g, ''))
      return bNum - aNum
    })
    keyTerms.push({ term: 'Contract Value', value: sortedAmounts[0] })
  }
  
  // Extract term length with more patterns
  const terms = extractTerms(text)
  console.log('Found terms:', terms)
  if (terms.length > 0) {
    keyTerms.push({ term: 'Term Length', value: terms[0] })
  }
  
  // Extract payment terms
  const paymentTerms = extractPaymentTerms(text)
  console.log('Found payment terms:', paymentTerms)
  if (paymentTerms) {
    keyTerms.push({ term: 'Payment Terms', value: paymentTerms })
  }
  
  // Extract termination notice
  const terminationNotice = extractTerminationNotice(text)
  console.log('Found termination notice:', terminationNotice)
  if (terminationNotice) {
    keyTerms.push({ term: 'Termination Notice Period', value: terminationNotice })
  }
  
  // Extract governing law
  const governingLaw = extractGoverningLaw(text)
  console.log('Found governing law:', governingLaw)
  if (governingLaw) {
    keyTerms.push({ term: 'Governing Law', value: governingLaw })
  }
  
  // Extract effective date
  const dates = extractDates(text)
  console.log('Found dates:', dates)
  if (dates.length > 0) {
    keyTerms.push({ term: 'Effective Date', value: dates[0] })
  }
  
  // Extract parties
  const parties = extractParties(contractText)
  console.log('Found parties:', parties)
  if (parties.length >= 1) {
    keyTerms.push({ term: 'Party 1', value: parties[0] })
  }
  if (parties.length >= 2) {
    keyTerms.push({ term: 'Party 2', value: parties[1] })
  }
  
  console.log('Final key terms:', keyTerms)
  return keyTerms.slice(0, 5)
}

function detectSmartAgreementType(contractText: string): string {
  const text = contractText.toLowerCase()
  console.log('Detecting agreement type from text...')
  
  // Check for specific agreement types with more patterns
  const agreementPatterns = [
    { type: 'Master Service Agreement', patterns: ['master service agreement', 'msa', 'master services agreement'] },
    { type: 'Non-Disclosure Agreement', patterns: ['non-disclosure agreement', 'nda', 'confidentiality agreement', 'non disclosure agreement'] },
    { type: 'Statement of Work', patterns: ['statement of work', 'sow', 'work statement'] },
    { type: 'Employment Agreement', patterns: ['employment agreement', 'employment contract', 'employee agreement'] },
    { type: 'Consulting Agreement', patterns: ['consulting agreement', 'consultant agreement', 'consulting contract'] },
    { type: 'License Agreement', patterns: ['license agreement', 'licensing agreement', 'software license'] },
    { type: 'Purchase Agreement', patterns: ['purchase agreement', 'purchase contract', 'sales agreement'] },
    { type: 'Services Agreement', patterns: ['services agreement', 'service agreement', 'professional services'] },
    { type: 'Lease', patterns: ['lease agreement', 'rental agreement', 'lease contract'] },
    { type: 'Supply Agreement', patterns: ['supply agreement', 'supplier agreement', 'supply contract'] }
  ]
  
  for (const { type, patterns } of agreementPatterns) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        console.log(`Detected agreement type: ${type} (matched: ${pattern})`)
        return type
      }
    }
  }
  
  console.log('No specific agreement type detected, using default')
  return 'Services Agreement'
}

// Enhanced helper functions with better pattern matching
function extractParties(text: string): string[] {
  const parties = []
  console.log('Extracting parties from text...')
  
  // Multiple patterns for company names
  const patterns = [
    // Standard corporate suffixes
    /([A-Z][a-zA-Z\s&.,-]+(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Ltd\.?|Limited|LP|LLP))/g,
    // Quoted company names
    /"([^"]+(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Ltd\.?))"/g,
    // Between patterns like "between X and Y"
    /between\s+([^,\n]+?)\s+(?:and|,)/gi,
    // Party definitions like "Party A" or similar
    /(?:party|client|contractor|vendor|supplier)[\s:]+([A-Z][a-zA-Z\s&.,-]+)/gi
  ]
  
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      console.log(`Found party matches with pattern:`, matches)
      parties.push(...matches.map(m => m.trim().replace(/^["']|["']$/g, '')))
    }
  }
  
  // Remove duplicates and clean up
  const uniqueParties = [...new Set(parties)]
    .filter(party => party.length > 3 && party.length < 100)
    .slice(0, 2)
  
  console.log('Final extracted parties:', uniqueParties)
  return uniqueParties
}

function extractDates(text: string): string[] {
  console.log('Extracting dates from text...')
  
  const patterns = [
    // Full month names
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
    // Numeric dates
    /\d{1,2}\/\d{1,2}\/\d{4}/g,
    // ISO dates
    /\d{4}-\d{2}-\d{2}/g,
    // Ordinal dates
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th),?\s+\d{4}/gi
  ]
  
  const dates = []
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      console.log(`Found date matches:`, matches)
      dates.push(...matches)
    }
  }
  
  const uniqueDates = [...new Set(dates)].slice(0, 3)
  console.log('Final extracted dates:', uniqueDates)
  return uniqueDates
}

function extractAmounts(text: string): string[] {
  console.log('Extracting amounts from text...')
  
  const patterns = [
    // Standard dollar amounts
    /\$[\d,]+(?:\.\d{2})?/g,
    // Written amounts
    /(?:dollars?|usd)\s*[\d,]+/gi,
    // Amounts with "million", "thousand", etc.
    /\$?[\d,]+(?:\.\d+)?\s*(?:million|thousand|k|m)/gi
  ]
  
  const amounts = []
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      console.log(`Found amount matches:`, matches)
      amounts.push(...matches)
    }
  }
  
  const uniqueAmounts = [...new Set(amounts)].slice(0, 5)
  console.log('Final extracted amounts:', uniqueAmounts)
  return uniqueAmounts
}

function extractTerms(text: string): string[] {
  console.log('Extracting terms from text...')
  
  const patterns = [
    // Written numbers with time periods
    /(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|1|2|3|4|5|6|7|8|9|10|11|12)\s+(?:months?|years?)/gi,
    // Numeric with parentheses
    /(?:twelve|12)\s*$$\s*12\s*$$\s*months?/gi,
    // Term periods
    /term\s+of\s+([^.]+?(?:months?|years?))/gi,
    // Duration patterns
    /duration\s+of\s+([^.]+?(?:months?|years?))/gi
  ]
  
  const terms = []
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      console.log(`Found term matches:`, matches)
      terms.push(...matches)
    }
  }
  
  const uniqueTerms = [...new Set(terms)].slice(0, 3)
  console.log('Final extracted terms:', uniqueTerms)
  return uniqueTerms
}

function extractPaymentTerms(text: string): string | null {
  console.log('Extracting payment terms from text...')
  
  const patterns = [
    { pattern: /net\s*(\d+)\s*days?/i, format: (match: RegExpMatchArray) => `Net ${match[1]} days` },
    { pattern: /upon\s+receipt/i, format: () => 'Upon receipt' },
    { pattern: /(?:paid\s+)?monthly/i, format: () => 'Monthly' },
    { pattern: /(?:paid\s+)?quarterly/i, format: () => 'Quarterly' },
    { pattern: /(?:paid\s+)?annually/i, format: () => 'Annually' },
    { pattern: /advance\s+payment/i, format: () => 'Advance payment' },
    { pattern: /payment\s+due\s+within\s+(\d+)\s+days?/i, format: (match: RegExpMatchArray) => `Due within ${match[1]} days` }
  ]
  
  for (const { pattern, format } of patterns) {
    const match = text.match(pattern)
    if (match) {
      const result = format(match)
      console.log(`Found payment terms: ${result}`)
      return result
    }
  }
  
  console.log('No payment terms found')
  return null
}

function extractTerminationNotice(text: string): string | null {
  console.log('Extracting termination notice from text...')
  
  const patterns = [
    /(?:thirty|30)\s*$$\s*30\s*$$\s*days?/i,
    /(?:sixty|60)\s*$$\s*60\s*$$\s*days?/i,
    /(?:ninety|90)\s*$$\s*90\s*$$\s*days?/i,
    /(?:fourteen|14)\s*$$\s*14\s*$$\s*days?/i,
    /(?:seven|7)\s*$$\s*7\s*$$\s*days?/i,
    /(\d+)\s*days?\s*(?:written\s+)?notice/i,
    /notice\s+of\s+(\d+)\s*days?/i
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      let result
      if (match[0].includes('thirty') || match[0].includes('30')) result = '30 days'
      else if (match[0].includes('sixty') || match[0].includes('60')) result = '60 days'
      else if (match[0].includes('ninety') || match[0].includes('90')) result = '90 days'
      else if (match[0].includes('fourteen') || match[0].includes('14')) result = '14 days'
      else if (match[0].includes('seven') || match[0].includes('7')) result = '7 days'
      else if (match[1]) result = `${match[1]} days`
      
      if (result) {
        console.log(`Found termination notice: ${result}`)
        return result
      }
    }
  }
  
  console.log('No termination notice found')
  return null
}

function extractGoverningLaw(text: string): string | null {
  console.log('Extracting governing law from text...')
  
  const patterns = [
    /governed\s+by\s+(?:the\s+)?laws?\s+of\s+(?:the\s+state\s+of\s+)?([a-z\s]+)/gi,
    /laws?\s+of\s+(?:the\s+state\s+of\s+)?([a-z\s]+)\s+shall\s+govern/gi,
    /jurisdiction\s+of\s+([a-z\s]+)/gi,
    /state\s+of\s+([a-z]+)/gi
  ]
  
  const states = ['california', 'delaware', 'new york', 'texas', 'florida', 'nevada', 'illinois', 'massachusetts']
  
  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      for (const match of matches) {
        for (const state of states) {
          if (match.toLowerCase().includes(state)) {
            const result = state.charAt(0).toUpperCase() + state.slice(1)
            console.log(`Found governing law: ${result}`)
            return result
          }
        }
      }
    }
  }
  
  console.log('No governing law found')
  return null
}
