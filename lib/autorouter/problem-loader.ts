import {
  DEFAULT_PROBLEM_EXAMPLE_ID,
  getProblemExample,
} from "@/lib/autorouter/problem-examples"
import type {
  LoadedRouteProblem,
  ProblemExampleId,
  RouteProblem,
} from "@/lib/autorouter/types"

type RouteProblemEnvelope = {
  autorouting_bug_report_id?: string
  title?: string
  simple_route_json: RouteProblem
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isRouteProblem(value: unknown): value is RouteProblem {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.layerCount === "number" &&
    isRecord(value.bounds) &&
    Array.isArray(value.obstacles) &&
    Array.isArray(value.connections)
  )
}

function extractRouteProblem(payload: unknown): {
  reportId?: string
  srj: RouteProblem
  title?: string
} {
  if (isRecord(payload) && "simple_route_json" in payload) {
    const envelope = payload as RouteProblemEnvelope

    if (!isRouteProblem(envelope.simple_route_json)) {
      throw new Error("The uploaded bug report does not contain a valid simple_route_json payload.")
    }

    return {
      reportId: envelope.autorouting_bug_report_id,
      srj: envelope.simple_route_json,
      title: envelope.title,
    }
  }

  if (isRouteProblem(payload)) {
    return {
      srj: payload,
    }
  }

  throw new Error("Expected either a simple route JSON object or an autorouter bug-report envelope.")
}

function createLoadedProblem({
  displayName,
  exampleId,
  reportId,
  sourceLabel,
  srj,
}: {
  displayName: string
  exampleId?: ProblemExampleId
  reportId?: string
  sourceLabel: string
  srj: RouteProblem
}): LoadedRouteProblem {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    displayName,
    exampleId,
    reportId,
    sourceLabel,
    srj,
  }
}

async function loadProblemPayload(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Unable to fetch the route fixture (${response.status}).`)
  }

  return response.json()
}

export async function loadExampleProblem(exampleId: ProblemExampleId) {
  const example = getProblemExample(exampleId)
  const payload = await loadProblemPayload(example.url)
  const { reportId, srj, title } = extractRouteProblem(payload)

  return createLoadedProblem({
    displayName: example.displayName || title?.trim() || "Route example",
    exampleId: example.id,
    reportId,
    sourceLabel: example.sourceLabel,
    srj: example.transform ? example.transform(srj) : srj,
  })
}

export async function loadDefaultProblem() {
  return loadExampleProblem(DEFAULT_PROBLEM_EXAMPLE_ID)
}

export async function loadProblemFromFile(file: File) {
  const payload = JSON.parse(await file.text()) as unknown
  const { reportId, srj, title } = extractRouteProblem(payload)

  return createLoadedProblem({
    displayName: title?.trim() || file.name.replace(/\.json$/i, "") || "Uploaded route problem",
    reportId,
    sourceLabel: file.name,
    srj,
  })
}
