'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'

interface HighlightInstance {
  id: string
  pageNumber: number
  text: string
  bounds: { x: number; y: number; width: number; height: number }
}

interface PDFViewerCanvasProps {
  file: File | null
  highlights: HighlightInstance[]
  currentHighlight: number
}

export function PDFViewerCanvas({ file, highlights, currentHighlight }: PDFViewerCanvasProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(1.2)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load PDF.js dynamically
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        // Load PDF.js from CDN
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = () => {
          // PDF.js is now available
          if (file) {
            loadPDF(file)
          }
        }
        document.head.appendChild(script)
      } catch (err) {
        setError('Failed to load PDF viewer')
      }
    }

    if (file && !pdfDoc) {
      loadPdfJs()
    }
  }, [file])

  const loadPDF = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      
      // @ts-ignore - PDF.js global
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      setIsLoading(false)
    } catch (err) {
      setError('Failed to load PDF')
      setIsLoading(false)
    }
  }

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc || !canvasRef.current) return

    try {
      const page = await pdfDoc.getPage(pageNum)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      const viewport = page.getViewport({ scale: zoom })
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      await page.render(renderContext).promise
    } catch (err) {
      console.error('Error rendering page:', err)
    }
  }

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage)
    }
  }, [pdfDoc, currentPage, zoom])

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
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5))
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">No document loaded</h3>
          <p className="text-sm">Upload a PDF contract to get started</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Loading PDF...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-500 max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium mb-2">PDF Loading Error</h3>
          <p className="text-sm mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={openPDFInNewTab} className="mr-2">
              Open in New Tab
            </Button>
            <Button onClick={downloadPDF} variant="outline">
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* PDF Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openPDFInNewTab}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Open
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <div className="bg-white shadow-lg">
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* Highlights Overlay */}
      {highlights.length > 0 && (
        <div className="absolute top-20 right-4 bg-white rounded-lg shadow-lg p-3 border max-w-xs z-10">
          <div className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
            <span>Highlights</span>
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
                onClick={() => {
                  // Navigate to the page with the highlight
                  setCurrentPage(highlight.pageNumber)
                }}
              >
                <div className="font-medium">Page {highlight.pageNumber}</div>
                <div className="text-gray-600 truncate" title={highlight.text}>
                  {highlight.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
