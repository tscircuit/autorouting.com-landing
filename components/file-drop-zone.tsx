"use client"

import { useState } from "react"
import type { ChangeEvent, DragEvent } from "react"
import { Upload } from "lucide-react"

type FileDropZoneProps = {
  currentLabel?: string | null
  disabled?: boolean
  onSelectFile: (file: File) => void | Promise<void>
}

export function FileDropZone({
  currentLabel,
  disabled = false,
  onSelectFile,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  function handleSelectedFile(file: File | null | undefined) {
    if (!file || disabled) {
      return
    }

    void onSelectFile(file)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()

    if (!disabled) {
      setIsDragging(true)
    }
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    handleSelectedFile(event.dataTransfer.files[0])
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    handleSelectedFile(event.target.files?.[0])
    event.target.value = ""
  }

  const label = disabled
    ? "Loading fixture..."
    : currentLabel ?? "Drop autorouter JSON"

  return (
    <label
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex h-9 max-w-[18rem] items-center gap-2 rounded-md border border-dashed px-3 text-xs transition-colors
        ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        ${isDragging
          ? "border-foreground bg-foreground/5"
          : "border-foreground/20 hover:border-foreground/40"
        }
      `}
      title={label}
    >
      <Upload className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-muted-foreground">{label}</span>
      <input
        type="file"
        accept=".json,application/json"
        disabled={disabled}
        onChange={handleFileSelect}
        className="sr-only"
      />
    </label>
  )
}
