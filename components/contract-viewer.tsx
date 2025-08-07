'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, ChevronUp, ChevronDown, ExternalLink, Download, FileText } from 'lucide-react'
import { PDFViewer } from './pdf-viewer'
import { ContractDetails } from './contract-details'
import { ChatInterface } from './chat-interface'

interface HighlightInstance {
  id: string
  pageNumber: number
  text: string
  bounds: { x: number; y: number; width: number; height: number }
}

export function ContractViewer() {
  const [file, setFile] = useState<File | null>(null)
  const [documentTitle, setDocumentTitle] = useState<string>('No document loaded')
  const [highlights, setHighlights] = useState<HighlightInstance[]>([])
  const [currentHighlight, setCurrentHighlight] = useState<number>(-1)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [hideChat, setHideChat] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('hideChat') === 'true') {
      setHideChat(true)
    }
  }, [])

  useEffect(() => {
    if (hideChat) {
      document.body.classList.add('hide-chat')
    } else {
      document.body.classList.remove('hide-chat')
    }
  }, [hideChat])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile)
      setDocumentTitle(uploadedFile.name.replace('.pdf', ''))
      setHighlights([])
      setCurrentHighlight(-1)
      
      // Clean up previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
      
      // Create new URL for the PDF
      const url = URL.createObjectURL(uploadedFile)
      setPdfUrl(url)
    }
  }

  const handleHighlightNavigation = (direction: 'next' | 'prev') => {
    if (highlights.length === 0) return
    
    if (direction === 'next') {
      setCurrentHighlight((prev) => (prev + 1) % highlights.length)
    } else {
      setCurrentHighlight((prev) => (prev - 1 + highlights.length) % highlights.length)
    }
  }

  const addHighlights = (newHighlights: HighlightInstance[]) => {
    setHighlights(newHighlights)
    setCurrentHighlight(newHighlights.length > 0 ? 0 : -1)
  }

  const openPdfInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const downloadPdf = () => {
    if (pdfUrl && file) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 contract-viewer">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {file && <FileText className="h-5 w-5 text-blue-600" />}
          <h1 className="text-xl font-semibold text-gray-900 truncate max-w-md">
            {documentTitle}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* PDF Controls */}
          {file && pdfUrl && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openPdfInNewTab}
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                View PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          )}
          
          {/* Highlight Navigation */}
          {highlights.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleHighlightNavigation('prev')}
                disabled={highlights.length === 0}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <span className="text-xs font-medium">
                {currentHighlight + 1} of {highlights.length} highlights
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleHighlightNavigation('next')}
                disabled={highlights.length === 0}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          {/* Upload Button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {file ? 'Upload New' : 'Upload Contract'}
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Contract Details */}
        {!hideChat && (
          <div className="w-96 bg-white border-r border-gray-200 relative h-full chat-interface">
            <div className="h-full overflow-y-auto pb-20">
              <ContractDetails file={file} onHighlight={addHighlights} />
            </div>
            <ChatInterface file={file} onHighlight={addHighlights} />
          </div>
        )}

        {/* Right Panel - PDF Viewer */}
        <div className="flex-1 bg-gray-100">
          <PDFViewer 
            file={file} 
            highlights={highlights}
            currentHighlight={currentHighlight}
          />
        </div>
      </div>
    </div>
  )
}
