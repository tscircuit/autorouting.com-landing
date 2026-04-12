"use client"

import { Play } from "lucide-react"

type StartOverlayProps = {
  onStart: () => void
}

export function StartOverlay({
  onStart,
}: StartOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
      <button
        type="button"
        onClick={onStart}
        className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/12 bg-black/55 px-5 py-3 text-sm text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur transition-colors hover:bg-black/70"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
          <Play className="h-4 w-4 fill-current" />
        </span>
        <span>Start Autorouter</span>
      </button>
    </div>
  )
}
