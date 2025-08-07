'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Download, RefreshCw } from 'lucide-react'

interface PDFViewerIframeProps {
  file: File | null
  highlights: any[]
  currentHighlight: number
}

export function PDFViewerIframe({ file, highlights, currentHighlight }: PDFViewerIframeProps) {
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    if (file) {
      setIsLoading(true)
      setShowFallback(false)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPdfDataUrl(result)
        setIsLoading(false)
      }
      reader.onerror = () => {
        setShowFallback(true)
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    }
  }, [file])

  const handleIframeError = () => {
    setShowFallback(true)
  }

  const openPDFInNewTab = () => {
    if (pdfDataUrl) {
      window.open(pdfDataUrl, '_blank')
    }
  }

  const downloadPDF = () => {
    if (file) {
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      URL.revokeObjectURL(url)
    }
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

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
        <span className="text-sm font-medium">{file.name}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openPDFInNewTab}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF}>
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 relative">
        {pdfDataUrl && !showFallback ? (
          <iframe
            src={pdfDataUrl}
            className="w-full h-full border-0"
            title="PDF Viewer"
            onError={handleIframeError}
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium mb-2">PDF Ready</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click below to view your PDF document
              </p>
              <div className="space-y-2">
                <Button onClick={openPDFInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open PDF
                </Button>
                <Button onClick={downloadPDF} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
