"use client"

import { Download, LoaderCircle } from "lucide-react"

type DownloadRoutedKicadButtonProps = {
  disabled?: boolean
  isLoading?: boolean
  onDownload: () => void
}

export function DownloadRoutedKicadButton({
  disabled = false,
  isLoading = false,
  onDownload,
}: DownloadRoutedKicadButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      title={
        disabled
          ? "Run the autorouter before downloading"
          : "Download the routed .kicad_pcb file"
      }
      onClick={onDownload}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-foreground/15 px-3 text-xs text-foreground transition-colors hover:border-foreground/35 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <Download className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span>{isLoading ? "Preparing KiCad..." : "Download Routed File"}</span>
    </button>
  )
}
