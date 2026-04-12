"use client"

import { startTransition, useEffect, useState } from "react"
import type {
  AutorouterSnapshot,
  AutorouterWorkerInbound,
  AutorouterWorkerOutbound,
  AutorouterWorkerState,
  LoadedRouteProblem,
} from "@/lib/autorouter/types"

function getWorkerState(snapshot: AutorouterSnapshot): AutorouterWorkerState {
  if (snapshot.solved) {
    return "solved"
  }

  if (snapshot.failed) {
    return "failed"
  }

  return "running"
}

export function useAutorouterWorker(problem: LoadedRouteProblem | null) {
  const [snapshot, setSnapshot] = useState<AutorouterSnapshot | null>(null)
  const [workerState, setWorkerState] = useState<AutorouterWorkerState>("idle")
  const [workerError, setWorkerError] = useState<string | null>(null)

  useEffect(() => {
    if (!problem) {
      setSnapshot(null)
      setWorkerState("idle")
      setWorkerError(null)
      return
    }

    const worker = new Worker(
      new URL("../../workers/autorouter.worker.ts", import.meta.url),
      {
        type: "module",
      },
    )

    setSnapshot(null)
    setWorkerState("starting")
    setWorkerError(null)

    worker.onmessage = (event: MessageEvent<AutorouterWorkerOutbound>) => {
      const message = event.data

      if (message.type === "error") {
        setWorkerState("error")
        setWorkerError(message.message)
        return
      }

      startTransition(() => {
        setSnapshot(message.snapshot)
      })

      setWorkerState(getWorkerState(message.snapshot))
    }

    worker.onerror = (event) => {
      setWorkerState("error")
      setWorkerError(event.message || "The autorouter worker crashed.")
    }

    const message: AutorouterWorkerInbound = {
      type: "start",
      srj: problem.srj,
    }

    worker.postMessage(message)

    return () => {
      worker.terminate()
    }
  }, [problem?.id])

  return {
    snapshot,
    workerState,
    workerError,
  }
}
