"use client"

import { LoaderCircle, Upload } from "lucide-react"
import { useRef } from "react"

type UploadKicadButtonProps = {
  disabled?: boolean
  isLoading?: boolean
  onFileSelect: (file: File) => void
}

export function UploadKicadButton({
  disabled = false,
  isLoading = false,
  onFileSelect,
}: UploadKicadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".kicad_pcb"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            onFileSelect(file)
          }

          event.target.value = ""
        }}
      />
      <button
        type="button"
        disabled={disabled || isLoading}
        title="Upload a .kicad_pcb file"
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-foreground/15 px-3 text-xs text-foreground transition-colors hover:border-foreground/35 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span>{isLoading ? "Converting KiCad..." : "Upload KiCad File"}</span>
      </button>
    </>
  )
}
