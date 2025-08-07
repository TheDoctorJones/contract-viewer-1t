'use client'

import { useState } from 'react'
import { ContractViewer } from '@/components/contract-viewer'

export default function Home() {
  return (
    <div className="h-screen flex flex-col">
      <ContractViewer />
    </div>
  )
}
