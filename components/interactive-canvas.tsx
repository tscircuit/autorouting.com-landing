export function InteractiveCanvas() {
  return (
    <div className="relative flex-1 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02]">
      {/* Subtle dot grid pattern */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.145 0 0 / 0.07) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Placeholder center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/40 select-none tracking-wide uppercase">
          Interactive autorouting canvas
        </p>
      </div>
    </div>
  )
}
