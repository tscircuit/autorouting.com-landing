"use client"

import { useState } from "react"

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <p className="text-xs text-muted-foreground">
        {"You're on the list. We'll be in touch."}
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="h-8 w-52 rounded-md border border-foreground/15 bg-transparent px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20"
      />
      <button
        type="submit"
        className="h-8 rounded-md bg-foreground px-3 text-xs text-background hover:bg-foreground/90 transition-colors"
      >
        Join the Waitlist
      </button>
    </form>
  )
}
