"use client"

import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PROBLEM_EXAMPLES,
  isProblemExampleId,
} from "@/lib/autorouter/problem-examples"
import type { ProblemExampleId } from "@/lib/autorouter/types"

type ExamplesDropdownProps = {
  currentExampleId: ProblemExampleId | null
  disabled?: boolean
  onSelectExample: (exampleId: ProblemExampleId) => void
}

export function ExamplesDropdown({
  currentExampleId,
  disabled = false,
  onSelectExample,
}: ExamplesDropdownProps) {
  function handleValueChange(value: string) {
    if (!isProblemExampleId(value)) {
      return
    }

    onSelectExample(value)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-foreground/15 px-3 text-xs text-foreground transition-colors hover:border-foreground/35 hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>Examples</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Built-in examples</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={currentExampleId ?? undefined}
          onValueChange={handleValueChange}
        >
          {PROBLEM_EXAMPLES.map((example) => (
            <DropdownMenuRadioItem key={example.id} value={example.id}>
              {example.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
