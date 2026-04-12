"use client"

import { Upload } from "lucide-react"

type UploadKicadButtonProps = {
  disabled?: boolean
}

export function UploadKicadButton({
  disabled = true,
}: UploadKicadButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title="KiCad upload coming soon"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-foreground/15 px-3 text-xs text-foreground transition-colors hover:border-foreground/35 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
      <span>Upload KiCad File</span>
    </button>
  )
}
