import { Github } from "lucide-react"

export function GithubBadge() {
  return (
    <a
      href="https://github.com/tscircuit/tscircuit-autorouter"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Github className="h-3.5 w-3.5" />
      <span>tscircuit/tscircuit-autorouter</span>
    </a>
  )
}
