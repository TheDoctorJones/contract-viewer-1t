// Real PDF text extraction using PDF.js
declare global {
  interface Window {
    pdfjsLib: any
  }
}

export async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting PDF text extraction for:', file.name)
      
      // Ensure PDF.js is loaded
      if (!window.pdfjsLib) {
        console.log('Loading PDF.js library...')
        await loadPdfJs()
      }

      const arrayBuffer = await file.arrayBuffer()
      console.log('PDF file size:', arrayBuffer.byteLength, 'bytes')
      
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      console.log('PDF loaded successfully. Pages:', pdf.numPages)
      
      let fullText = ''
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Extracting text from page ${pageNum}...`)
        
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        console.log(`Page ${pageNum} has ${textContent.items.length} text items`)
        
        // Combine all text items from the page with better spacing
        const pageText = textContent.items
          .map((item: any) => {
            // Add space handling for better text flow
            let text = item.str
            if (item.hasEOL) {
              text += '\n'
            }
            return text
          })
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
        
        console.log(`Page ${pageNum} extracted text length:`, pageText.length)
        console.log(`Page ${pageNum} first 200 chars:`, pageText.substring(0, 200))
        
        if (pageText.length > 0) {
          fullText += `\n\n--- PAGE ${pageNum} ---\n${pageText}`
        }
      }
      
      console.log('Total extracted text length:', fullText.length)
      console.log('First 500 characters of extracted text:', fullText.substring(0, 500))
      console.log('Last 500 characters of extracted text:', fullText.substring(fullText.length - 500))
      
      if (fullText.trim().length === 0) {
        console.warn('No text extracted from PDF - might be image-based or encrypted')
        reject(new Error('No text could be extracted from this PDF. It may be image-based or encrypted.'))
        return
      }
      
      resolve(fullText.trim())
    } catch (error) {
      console.error('Error extracting PDF text:', error)
      reject(error)
    }
  })
}

async function loadPdfJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      console.log('PDF.js loaded successfully')
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js'))
    document.head.appendChild(script)
  })
}

// Extract highlights from contract text based on search terms
export function findTextHighlights(contractText: string, searchTerms: string[]): Array<{
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

  searchTerms.forEach((term, index) => {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    let match
    
    while ((match = regex.exec(contractText)) !== null) {
      // Determine page number based on page markers
      const textBeforeMatch = contractText.substring(0, match.index)
      const pageMatches = textBeforeMatch.match(/--- PAGE \d+ ---/g)
      const pageNumber = pageMatches ? pageMatches.length : 1
      
      highlights.push({
        id: `highlight-${index}-${match.index}`,
        pageNumber: pageNumber,
        text: match[0],
        bounds: {
          x: 50 + (match.index % 100),
          y: 100 + ((match.index % 1000) / 10),
          width: match[0].length * 6,
          height: 16
        }
      })
    }
  })

  return highlights
}
