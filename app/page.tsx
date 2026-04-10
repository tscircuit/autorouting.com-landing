import { FileDropZone } from "@/components/file-drop-zone"
import { WaitlistForm } from "@/components/waitlist-form"
import { InteractiveCanvas } from "@/components/interactive-canvas"

export default function Home() {
  return (
    <main className="flex h-screen flex-col p-4">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-medium text-foreground tracking-tight">
            The World&apos;s Fastest Autorouter
          </h1>
          <a
            href="https://blog.autorouting.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Blog
          </a>
          <a
            href="https://github.com/tscircuit/tscircuit-autorouter"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Github
          </a>
        </div>
        <FileDropZone />
      </header>

      {/* Canvas area */}
      <div className="flex flex-1 flex-col gap-4 pt-4">
        <InteractiveCanvas />
      </div>

      {/* Bottom bar */}
      <footer className="flex items-center justify-between pt-4">
        <span className="text-xs text-muted-foreground">&copy; tscircuit Inc.</span>
        <WaitlistForm />
      </footer>
    </main>
  )
}
