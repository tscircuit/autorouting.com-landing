"use client"

import { useState, useCallback } from "react"
import { Upload } from "lucide-react"

export function FileDropZone() {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setFileName(file.name)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
    }
  }, [])

  return (
    <label
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex items-center gap-2 cursor-pointer px-3 py-2 text-xs
        border border-dashed rounded-md transition-colors
        ${isDragging
          ? "border-foreground bg-foreground/5"
          : "border-foreground/20 hover:border-foreground/40"
        }
      `}
    >
      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">
        {fileName ? fileName : "Drop .kicad_pcb"}
      </span>
      <input
        type="file"
        accept=".kicad_pcb"
        onChange={handleFileSelect}
        className="sr-only"
      />
    </label>
  )
}
