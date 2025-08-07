'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink } from 'lucide-react'

interface HighlightInstance {
  id: string
  pageNumber: number
  text: string
  bounds: { x: number; y: number; width: number; height: number }
}

interface PDFViewerProps {
  file: File | null
  highlights: HighlightInstance[]
  currentHighlight: number
}

// Declare PDF.js types
declare global {
  interface Window {
    pdfjsLib: any
  }
}

export function PDFViewer({ file, highlights, currentHighlight }: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false)
  const [pageTextMaps, setPageTextMaps] = useState<Map<number, any>>(new Map())
  const [allPagesRendered, setAllPagesRendered] = useState<number[]>([])
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  // Debug
  useEffect(() => {
    console.log('PDF Viewer state:', {
      file: file?.name,
      pdfJsLoaded,
      isLoading,
      error,
      pdfDoc: !!pdfDoc,
      totalPages,
      allPagesRendered: allPagesRendered.length
    })
  }, [file, pdfJsLoaded, isLoading, error, pdfDoc, totalPages, allPagesRendered])

  // Load PDF.js library
  useEffect(() => {
    const loadPdfJs = () => {
      if (window.pdfjsLib) {
        console.log('PDF.js already loaded')
        setPdfJsLoaded(true)
        return
      }

      console.log('Loading PDF.js...')
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = () => {
        console.log('PDF.js loaded successfully')
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        setPdfJsLoaded(true)
      }
      script.onerror = (e) => {
        console.error('Failed to load PDF.js:', e)
        setError('Failed to load PDF.js library')
      }
      document.head.appendChild(script)
    }

    loadPdfJs()
  }, [])

  // Load PDF when file changes
  useEffect(() => {
    if (file && pdfJsLoaded) {
      console.log('Starting PDF load...')
      loadPDF()
    }
  }, [file, pdfJsLoaded])

  // Render all pages when PDF loads
  useEffect(() => {
    if (pdfDoc && totalPages > 0) {
      console.log('PDF loaded, starting to render all pages...')
      renderAllPages()
    }
  }, [pdfDoc, totalPages])

  // Re-render when scale changes
  useEffect(() => {
    if (pdfDoc && allPagesRendered.length > 0) {
      console.log('Scale changed, re-rendering pages...')
      renderAllPages()
    }
  }, [scale])

  // Apply highlights
  useEffect(() => {
    if (highlights.length > 0 && allPagesRendered.length > 0) {
      applyTextHighlights()
    } else {
      clearTextHighlights()
    }
  }, [highlights, currentHighlight, allPagesRendered, pageTextMaps])

  const loadPDF = async () => {
    if (!file || !window.pdfjsLib) {
      console.log('Cannot load PDF: missing file or PDF.js')
      return
    }

    console.log('Loading PDF file:', file.name, 'Size:', file.size)
    setIsLoading(true)
    setError(null)
    setAllPagesRendered([])
    setPageTextMaps(new Map())

    try {
      const arrayBuffer = await file.arrayBuffer()
      console.log('Got arrayBuffer, size:', arrayBuffer.byteLength)
      
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      console.log('PDF document loaded successfully')
      console.log('Number of pages:', pdf.numPages)
      
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      setIsLoading(false)
      
    } catch (err) {
      console.error('Error loading PDF:', err)
      setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsLoading(false)
    }
  }

  const renderAllPages = async () => {
    if (!pdfDoc) {
      console.log('No PDF document to render')
      return
    }

    console.log(`Starting to render ${pdfDoc.numPages} pages...`)
    const renderedPages: number[] = []
    const newPageTextMaps = new Map()

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      try {
        console.log(`Rendering page ${pageNum}...`)
        
        const canvas = canvasRefs.current.get(pageNum)
        const textLayer = textLayerRefs.current.get(pageNum)
        
        if (!canvas || !textLayer) {
          console.log(`Missing canvas or textLayer for page ${pageNum}`)
          continue
        }

        const page = await pdfDoc.getPage(pageNum)
        const viewport = page.getViewport({ scale })
        
        // Set canvas dimensions
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        // Set text layer dimensions
        textLayer.style.width = `${viewport.width}px`
        textLayer.style.height = `${viewport.height}px`
        
        // Clear previous content
        const context = canvas.getContext('2d')
        if (!context) continue
        
        context.clearRect(0, 0, canvas.width, canvas.height)
        textLayer.innerHTML = ''
        
        // Render PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        
        await page.render(renderContext).promise
        console.log(`Page ${pageNum} canvas rendered`)
        
        // Get text content
        const textContent = await page.getTextContent()
        const textMap = new Map()
        
        textContent.items.forEach((textItem: any, index: number) => {
          const textDiv = document.createElement('div')
          textDiv.textContent = textItem.str
          textDiv.style.position = 'absolute'
          textDiv.style.whiteSpace = 'pre'
          textDiv.style.color = 'transparent'
          textDiv.style.pointerEvents = 'none'
          textDiv.style.userSelect = 'text'
          textDiv.dataset.textIndex = index.toString()
          
          // Transform coordinates
          const transform = viewport.transform
          const tx = textItem.transform
          
          const x = transform[0] * tx[4] + transform[2] * tx[5] + transform[4]
          const y = transform[1] * tx[4] + transform[3] * tx[5] + transform[5]
          
          const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1])
          const fontSizeScaled = fontSize * scale
          
          textDiv.style.fontSize = `${fontSizeScaled}px`
          textDiv.style.fontFamily = textItem.fontName || 'sans-serif'
          textDiv.style.left = `${x}px`
          textDiv.style.top = `${y - fontSizeScaled}px`
          textDiv.style.width = `${textItem.width * scale}px`
          textDiv.style.height = `${fontSizeScaled}px`
          
          textLayer.appendChild(textDiv)
          
          textMap.set(index, {
            element: textDiv,
            text: textItem.str,
            bounds: {
              x: x,
              y: y - fontSizeScaled,
              width: textItem.width * scale,
              height: fontSizeScaled
            },
            originalItem: textItem
          })
        })
        
        newPageTextMaps.set(pageNum, textMap)
        renderedPages.push(pageNum)
        console.log(`Page ${pageNum} completed with ${textContent.items.length} text items`)
        
      } catch (err) {
        console.error(`Error rendering page ${pageNum}:`, err)
      }
    }
    
    setPageTextMaps(newPageTextMaps)
    setAllPagesRendered(renderedPages)
    console.log(`Finished rendering ${renderedPages.length} pages`)
  }

  const findTextInTextLayer = (searchText: string, pageNum: number) => {
    const textMap = pageTextMaps.get(pageNum)
    if (!textMap) return []

    const cleanSearchText = searchText.toLowerCase().trim()
    let fullPageText = ''
    const elementPositions = []
    
    for (const [index, textData] of textMap.entries()) {
      const startIndex = fullPageText.length
      const text = textData.text
      
      elementPositions.push({
        startIndex,
        endIndex: startIndex + text.length,
        element: textData.element,
        bounds: textData.bounds,
        text: text,
        index: index
      })
      
      fullPageText += text + ' '
    }
    
    const cleanFullText = fullPageText.toLowerCase()
    const matches = []
    
    let searchIndex = 0
    while (true) {
      const foundIndex = cleanFullText.indexOf(cleanSearchText, searchIndex)
      if (foundIndex === -1) break
      
      const matchStart = foundIndex
      const matchEnd = foundIndex + cleanSearchText.length
      
      const matchingElements = []
      
      elementPositions.forEach(pos => {
        if (pos.startIndex <= matchEnd && pos.endIndex >= matchStart) {
          matchingElements.push(pos)
        }
      })
      
      if (matchingElements.length > 0) {
        matches.push({
          elements: matchingElements,
          matchStart,
          matchEnd,
          searchText: cleanSearchText
        })
      }
      
      searchIndex = foundIndex + 1
    }
    
    return matches
  }

  const applyTextHighlights = () => {
    clearTextHighlights()
    
    highlights.forEach((highlight, index) => {
      const isActive = index === currentHighlight
      const matches = findTextInTextLayer(highlight.text, highlight.pageNumber)
      
      matches.forEach((match) => {
        match.elements.forEach((elementData) => {
          const bounds = elementData.bounds
          const textLayer = textLayerRefs.current.get(highlight.pageNumber)
          
          if (!textLayer) return
          
          const highlightDiv = document.createElement('div')
          highlightDiv.style.position = 'absolute'
          highlightDiv.style.left = `${bounds.x}px`
          highlightDiv.style.top = `${bounds.y}px`
          highlightDiv.style.width = `${bounds.width}px`
          highlightDiv.style.height = `${bounds.height}px`
          highlightDiv.style.backgroundColor = isActive ? 'rgba(255, 255, 0, 0.7)' : 'rgba(255, 255, 0, 0.4)'
          highlightDiv.style.pointerEvents = 'none'
          highlightDiv.style.zIndex = '10'
          highlightDiv.className = 'pdf-highlight'
          
          if (isActive) {
            highlightDiv.style.border = '2px solid rgba(255, 193, 7, 0.9)'
            highlightDiv.style.boxShadow = '0 0 8px rgba(255, 193, 7, 0.6)'
          }
          
          textLayer.appendChild(highlightDiv)
        })
      })
    })
  }

  const clearTextHighlights = () => {
    textLayerRefs.current.forEach((textLayer) => {
      const highlights = textLayer.querySelectorAll('.pdf-highlight')
      highlights.forEach(highlight => highlight.remove())
    })
  }

  const scrollToPage = (pageNum: number) => {
    const canvas = canvasRefs.current.get(pageNum)
    if (canvas && containerRef.current) {
      const pageContainer = canvas.parentElement
      if (pageContainer) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const pageRect = pageContainer.getBoundingClientRect()
        const scrollTop = containerRef.current.scrollTop + pageRect.top - containerRect.top - 100
        
        containerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        })
      }
    }
  }

  // Navigate to highlight
  useEffect(() => {
    if (currentHighlight >= 0 && highlights[currentHighlight]) {
      const highlight = highlights[currentHighlight]
      scrollToPage(highlight.pageNumber)
    }
  }, [currentHighlight])

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

  const downloadPDF = () => {
    if (file) {
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const openPDFInNewTab = () => {
    if (file) {
      const url = URL.createObjectURL(file)
      window.open(url, '_blank')
      URL.revokeObjectURL(url)
    }
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">No document loaded</h3>
          <p className="text-sm">Upload a PDF contract to get started</p>
        </div>
      </div>
    )
  }

  if (!pdfJsLoaded || isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">
            {!pdfJsLoaded ? 'Loading PDF viewer...' : 'Loading document...'}
          </div>
          {allPagesRendered.length > 0 && totalPages > 0 && (
            <div className="mt-2 text-sm text-gray-400">
              Rendered: {allPagesRendered.length} / {totalPages} pages
            </div>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-500 max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
          <p className="text-sm mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={openPDFInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button onClick={downloadPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Generate array of page numbers for rendering
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="h-full flex flex-col bg-gray-100 relative">
      {/* PDF Container - Full Height */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <div className="flex flex-col items-center space-y-4">
          {pageNumbers.map(pageNum => (
            <div key={pageNum} className="bg-white shadow-lg border relative">
              {/* Page Label */}
              <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded z-10">
                Page {pageNum}
              </div>
              
              {/* Canvas */}
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(pageNum, el)
                }}
                className="block max-w-full h-auto"
                style={{ cursor: 'grab' }}
              />
              
              {/* Text Layer */}
              <div
                ref={(el) => {
                  if (el) textLayerRefs.current.set(pageNum, el)
                }}
                className="absolute top-0 left-0 overflow-hidden"
                style={{ pointerEvents: 'none', zIndex: 2 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Zoom Controls */}
      <div className="absolute bottom-6 right-6 bg-white rounded-full shadow-lg border border-gray-200 flex items-center gap-1 p-1 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          disabled={scale <= 0.5}
          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs font-medium px-2 text-gray-600 min-w-[45px] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          disabled={scale >= 3}
          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Highlights Panel */}
      {highlights.length > 0 && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 border max-w-xs z-20">
          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
            <span>Text Highlights</span>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {highlights.length}
            </span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {highlights.map((highlight, index) => (
              <div
                key={highlight.id}
                className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                  index === currentHighlight
                    ? 'bg-yellow-200 border border-yellow-400'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => scrollToPage(highlight.pageNumber)}
              >
                <div className="font-medium">Page {highlight.pageNumber}</div>
                <div className="text-gray-600 truncate" title={highlight.text}>
                  {highlight.text.substring(0, 50)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
