'use client'

import { useState, useEffect } from 'react'

interface PDFViewerSimpleProps {
  file: File | null
}

export function PDFViewerSimple({ file }: PDFViewerSimpleProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPdfUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  if (!file || !pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <p>Upload a PDF to view it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <embed
        src={pdfUrl}
        type="application/pdf"
        width="100%"
        height="100%"
        style={{ border: 'none' }}
      />
    </div>
  )
}
