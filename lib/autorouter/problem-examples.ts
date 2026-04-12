import { applyArduinoUnoStaticSrjAdjustments } from "@/lib/autorouter/arduino-uno-static-srj"
import type { ProblemExampleId, RouteProblem } from "@/lib/autorouter/types"

type ProblemExample = {
  id: ProblemExampleId
  label: string
  displayName: string
  url: string
  sourceLabel: string
  transform?: (srj: RouteProblem) => RouteProblem
}

export const DEFAULT_PROBLEM_EXAMPLE_ID: ProblemExampleId = "arduino-uno-minimal"

export const PROBLEM_EXAMPLES: readonly ProblemExample[] = [
  {
    id: "arduino-uno-minimal",
    label: "Arduino Uno (minimal)",
    displayName: "Arduino Uno (minimal)",
    url: "/fixtures/default-autorouter-problem.json",
    sourceLabel: "Example",
    transform: applyArduinoUnoStaticSrjAdjustments,
  },
  {
    id: "keyboard",
    label: "Keyboard",
    displayName: "Keyboard",
    url: "https://raw.githubusercontent.com/tscircuit/tscircuit-autorouter/refs/heads/main/fixtures/legacy/assets/keyboard4.json",
    sourceLabel: "Example",
  },
] as const

export function isProblemExampleId(value: string): value is ProblemExampleId {
  return PROBLEM_EXAMPLES.some((example) => example.id === value)
}

export function getProblemExample(exampleId: ProblemExampleId) {
  const example = PROBLEM_EXAMPLES.find((candidate) => candidate.id === exampleId)

  if (!example) {
    throw new Error(`Unknown problem example: ${exampleId}`)
  }

  return example
}
