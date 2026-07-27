"use client"

import { startTransition, useEffect, useState } from "react"
import { ExamplesDropdown } from "@/components/autorouter/examples-dropdown"
import { WorkerProfileIndicator } from "@/components/autorouter/worker-profile-indicator"
import { InteractiveCanvas } from "@/components/interactive-canvas"
import { SeveibarLink } from "@/components/seveibar-link"
import { UploadKicadButton } from "@/components/upload-kicad-button"
import {
  loadDefaultProblem,
  loadExampleProblem,
  loadProblemFromKicadFile,
} from "@/lib/autorouter/problem-loader"
import type {
  LoadedRouteProblem,
  ProblemExampleId,
  WorkerPerformanceProfile,
} from "@/lib/autorouter/types"

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
  const [workerProfile, setWorkerProfile] =
    useState<WorkerPerformanceProfile>("default")

  useEffect(() => {
    void restoreDefaultProblem()
  }, [])

  async function loadProblem(loadNextProblem: () => Promise<LoadedRouteProblem>) {
    setIsLoading(true)
    setLoadError(null)

    try {
      const nextProblem = await loadNextProblem()

      startTransition(() => {
        setProblem(nextProblem)
      })
    } catch (error) {
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function restoreDefaultProblem() {
    await loadProblem(() => loadDefaultProblem())
  }

  async function handleExampleSelect(exampleId: ProblemExampleId) {
    await loadProblem(() => loadExampleProblem(exampleId))
  }

  async function handleKicadFileSelect(file: File) {
    await loadProblem(() => loadProblemFromKicadFile(file))
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-black/5 px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
          <UploadKicadButton
            disabled={isLoading}
            isLoading={isLoading}
            onFileSelect={handleKicadFileSelect}
          />
          <ExamplesDropdown
            currentExampleId={problem?.exampleId ?? null}
            disabled={isLoading}
            onSelectExample={handleExampleSelect}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <InteractiveCanvas
          problem={problem}
          isLoading={isLoading}
          loadError={loadError}
          onProfileChange={setWorkerProfile}
        />
      </div>

      <footer className="flex flex-col gap-3 border-t border-black/5 px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <a
            href="https://tscircuit.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            &copy; {new Date().getFullYear()} tscircuit Inc.
          </a>
          <WorkerProfileIndicator profile={workerProfile} />
        </div>
        <SeveibarLink />
      </footer>
    </main>
  )
}
