"use client"

import { startTransition, useEffect, useState } from "react"
import { FileDropZone } from "@/components/file-drop-zone"
import { InteractiveCanvas } from "@/components/interactive-canvas"
import { WaitlistForm } from "@/components/waitlist-form"
import { loadDefaultProblem, loadProblemFromFile } from "@/lib/autorouter/problem-loader"
import type { LoadedRouteProblem } from "@/lib/autorouter/types"

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return "Unable to load the autorouter problem."
}

export function LandingExperience() {
  const [problem, setProblem] = useState<LoadedRouteProblem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void restoreDefaultProblem()
  }, [])

  async function restoreDefaultProblem() {
    setIsLoading(true)
    setLoadError(null)

    try {
      const nextProblem = await loadDefaultProblem()

      startTransition(() => {
        setProblem(nextProblem)
      })
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleProblemFile(file: File) {
    setIsLoading(true)
    setLoadError(null)

    try {
      const nextProblem = await loadProblemFromFile(file)

      startTransition(() => {
        setProblem(nextProblem)
      })
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      <header className="flex flex-col gap-4 border-b border-black/5 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-sm font-medium tracking-tight text-foreground">
            The World&apos;s Fastest Autorouter
          </h1>
          <a
            href="https://blog.autorouting.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </a>
          <a
            href="https://github.com/tscircuit/tscircuit-autorouter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://tscircuit.com/join"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Discord
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={restoreDefaultProblem}
            disabled={isLoading}
            className="h-9 rounded-md border border-foreground/15 px-3 text-xs text-foreground transition-colors hover:border-foreground/35 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Use Default
          </button>
          <FileDropZone
            currentLabel={problem?.sourceLabel}
            disabled={isLoading}
            onSelectFile={handleProblemFile}
          />
        </div>
      </header>

      <div className="flex min-h-[60vh] flex-1 flex-col">
        <InteractiveCanvas
          problem={problem}
          isLoading={isLoading}
          loadError={loadError}
        />
      </div>

      <footer className="flex flex-col gap-3 border-t border-black/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="https://tscircuit.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          &copy; {new Date().getFullYear()} tscircuit Inc.
        </a>
        <WaitlistForm />
      </footer>
    </main>
  )
}
