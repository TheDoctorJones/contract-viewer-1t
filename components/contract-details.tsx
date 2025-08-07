'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Edit2, Check, X, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { extractTextFromPDF } from '@/utils/pdf-text-extractor'

interface ContractDetailsProps {
  file: File | null
  onHighlight: (highlights: any[]) => void
}

interface KeyTerm {
  term: string
  value: string | string[]
}

// Agreement types from your schema
const AGREEMENT_TYPES = [
  'Master Service Agreement',
  'Non-Disclosure Agreement', 
  'Statement of Work',
  'License Agreement',
  'Services Agreement',
  'Purchase Agreement',
  'Employment Agreement',
  'Consulting Agreement',
  'Lease',
  'Supply Agreement',
  'Distribution Agreement',
  'Purchase Order',
  'Engagement Letter',
  'Letter of Intent',
  'Memorandum of Understanding',
  'Order Form',
  'Proposal',
  'Quote',
  'Retainer',
  'Service Level Agreement',
  'Terms and Conditions',
  'Contractor Agreement',
  'Franchise Agreement',
  'Partnership Agreement',
  'Joint Venture Agreement',
  'Offer Letter',
  'Intellectual Property Assignment Agreement',
  'Publishing Agreement',
  'Investment Agreement',
  'Wealth Management Agreement',
  'Credit Card Agreement',
  'Employment Separation Agreement',
  'Event Agreement',
  'Loan Agreement',
  'Marketing Agreement',
  'Privacy Agreement',
  'Release Agreement',
  'Renewal Agreement',
  'Stock Purchase Agreement',
  'Subscription Agreement',
  'Termination Agreement'
]

// Contract attributes that will be extracted
const CONTRACT_ATTRIBUTES = [
  'Contract Value',
  'Term Length', 
  'Termination Notice Period',
  'Governing Law',
  'Payment Terms',
  'Renewal Terms',
  'Liability Cap',
  'Confidentiality Period',
  'Effective Date',
  'Expiration Date',
  'Party 1',
  'Party 2',
  'Jurisdiction',
  'Force Majeure',
  'Amendment Process'
]

export function ContractDetails({ file, onHighlight }: ContractDetailsProps) {
  const [agreementType, setAgreementType] = useState<string>('')
  const [isEditingType, setIsEditingType] = useState(false)
  const [summary, setSummary] = useState<string>('')
  const [keyTerms, setKeyTerms] = useState<KeyTerm[]>([])
  const [attributes, setAttributes] = useState<Record<string, string>>({})
  const [editingAttribute, setEditingAttribute] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [contractText, setContractText] = useState<string>('')
  const [error, setError] = useState<any>(null)

  // Analyze contract when file changes
  useEffect(() => {
    if (file) {
      analyzeContract(file)
    } else {
      // Reset state when no file
      setAgreementType('')
      setSummary('')
      setKeyTerms([])
      setAttributes({})
      setContractText('')
      setError(null)
    }
  }, [file])

  const analyzeContract = async (file: File) => {
    setIsAnalyzing(true)
    setError(null)
    
    try {
      // Extract text from PDF
      const text = await extractTextFromPDF(file)
      setContractText(text)

      // Use the enhanced OpenAI API
      const response = await fetch('/api/analyze-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractText: text,
          agreementType: agreementType
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Analysis failed:', data)
        setError(data)
        setSummary('Analysis failed. See error details below.')
        setKeyTerms([])
        return
      }
      
      console.log('Analysis response:', data)
      
      // Update state with analysis
      setSummary(data.summary)
      setAgreementType(data.detectedType || 'Master Service Agreement')
      
      // Set attributes directly from the API response
      if (data.attributes) {
        console.log('Setting attributes:', data.attributes)
        setAttributes(data.attributes)
        
        // Convert attributes to key terms for the Key Terms section
        // Start with Type as the first key term
        const extractedKeyTerms: KeyTerm[] = [
          { term: 'Type', value: data.detectedType || 'Master Service Agreement' }
        ]
        
        // Combine parties into a single entry
        const parties: string[] = []
        if (data.attributes['Party 1'] && data.attributes['Party 1'] !== 'Not specified') {
          parties.push(data.attributes['Party 1'])
        }
        if (data.attributes['Party 2'] && data.attributes['Party 2'] !== 'Not specified') {
          parties.push(data.attributes['Party 2'])
        }
        
        if (parties.length > 0) {
          extractedKeyTerms.push({ term: 'Parties', value: parties })
        }
        
        // Add other key attributes (limit to top 4 additional terms after Type and Parties)
        const priorityAttributes = ['Contract Value', 'Term Length', 'Payment Terms', 'Effective Date']
        priorityAttributes.forEach(attr => {
          if (data.attributes[attr] && data.attributes[attr] !== 'Not specified') {
            extractedKeyTerms.push({ term: attr, value: data.attributes[attr] })
          }
        })
        
        setKeyTerms(extractedKeyTerms.slice(0, 6)) // Show top 6 including Type and Parties
      } else {
        // Fallback: initialize with empty values
        const initialAttributes: Record<string, string> = {}
        CONTRACT_ATTRIBUTES.forEach(attr => {
          initialAttributes[attr] = 'Not specified'
        })
        setAttributes(initialAttributes)
        setKeyTerms([{ term: 'Type', value: agreementType || 'Not specified' }])
      }

    } catch (error) {
      console.error('Error analyzing contract:', error)
      setError({ error: 'Network or parsing error', details: error instanceof Error ? error.message : String(error) })
      setSummary('Error analyzing contract. Please try again.')
      setKeyTerms([])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAttributeEdit = (key: string, value: string) => {
    setEditingAttribute(key)
    setEditValue(value)
  }

  const saveAttributeEdit = () => {
    if (editingAttribute) {
      setAttributes(prev => ({
        ...prev,
        [editingAttribute]: editValue
      }))
    }
    setEditingAttribute(null)
    setEditValue('')
  }

  const cancelAttributeEdit = () => {
    setEditingAttribute(null)
    setEditValue('')
  }

  const handleAgreementTypeChange = (newType: string) => {
    setAgreementType(newType)
    setIsEditingType(false)
    
    // Update the Type in key terms
    setKeyTerms(prev => prev.map(term => 
      term.term === 'Type' 
        ? { ...term, value: newType }
        : term
    ))
    
    // Re-analyze with new agreement type if we have contract text
    if (contractText && file) {
      analyzeContract(file)
    }
  }

  if (!file) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Upload a contract to view details</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              {error.error === 'OpenAI API Quota Exceeded' ? 'OpenAI Quota Exceeded' : 'Analysis Error'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {error.error === 'OpenAI API Quota Exceeded' ? (
                <div className="space-y-3">
                  <p className="text-red-700">
                    Your OpenAI API key has exceeded its quota. This confirms your API key is being used correctly.
                  </p>
                  
                  {error.apiKeyInfo && (
                    <div className="bg-red-100 p-3 rounded">
                      <strong>API Key Info:</strong>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>Key: {error.apiKeyInfo.keyPrefix}...</li>
                        <li>Length: {error.apiKeyInfo.keyLength} characters</li>
                        <li>Valid format: {error.apiKeyInfo.isValidFormat ? 'Yes' : 'No'}</li>
                      </ul>
                    </div>
                  )}
                  
                  <div>
                    <strong>Next steps:</strong>
                    <ul className="mt-1 space-y-1 text-xs list-disc list-inside">
                      {error.suggestions?.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('https://platform.openai.com/usage', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Check Usage
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open('https://platform.openai.com/account/billing', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Check Billing
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div><strong>Error:</strong> {error.error}</div>
                  {error.errorDetails && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium">Show technical details</summary>
                      <pre className="mt-1 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(error.errorDetails, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agreement Summary with Key Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Agreement Summary
            {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing contract with AI...
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary || 'AI analysis will appear here after processing the contract.'}
              </p>
              
              {/* Key Terms */}
              {keyTerms.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  {keyTerms.map((keyTerm, index) => (
                    <div key={index} className={`flex justify-between ${keyTerm.term === 'Parties' ? 'items-start' : 'items-center'}`}>
                      <span className="text-sm font-medium text-gray-600">{keyTerm.term}:</span>
                      {keyTerm.term === 'Type' ? (
                        isEditingType ? (
                          <div className="flex gap-2">
                            <Select value={agreementType} onValueChange={handleAgreementTypeChange}>
                              <SelectTrigger className="w-48 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AGREEMENT_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsEditingType(false)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {typeof keyTerm.value === 'string' ? keyTerm.value : keyTerm.value[0]}
                          </Badge>
                        )
                      ) : keyTerm.term === 'Parties' && Array.isArray(keyTerm.value) ? (
                        <div className="flex flex-col items-end gap-1">
                          {keyTerm.value.map((party, partyIndex) => (
                            <Badge key={partyIndex} variant="secondary" className="text-xs">
                              {party}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {typeof keyTerm.value === 'string' ? keyTerm.value : keyTerm.value[0]}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Agreement Attributes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agreement Attributes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {CONTRACT_ATTRIBUTES.map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-gray-500">{key}</Label>
                {editingAttribute === key ? (
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Button size="sm" onClick={saveAttributeEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelAttributeEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center group">
                    <span className={`text-sm ${attributes[key] === 'Not specified' ? 'text-gray-400' : 'text-gray-900'}`}>
                      {attributes[key] || 'Not specified'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAttributeEdit(key, attributes[key] || '')}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
