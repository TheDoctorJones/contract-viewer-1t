'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, ExternalLink, FileText } from 'lucide-react'

interface PDFDisplayFallbackProps {
  file: File
  onDownload: () => void
  onOpenNewTab: () => void
}

export function PDFDisplayFallback({ file, onDownload, onOpenNewTab }: PDFDisplayFallbackProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-lg">PDF Ready to View</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              <strong>{file.name}</strong>
            </p>
            <p>
              Your PDF is loaded and ready for analysis. Use the options below to view the document.
            </p>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={onOpenNewTab}
              className="w-full flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
            
            <Button 
              onClick={onDownload}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            <p>
              The contract analysis and chat features work regardless of PDF display.
              All AI features are fully functional.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
