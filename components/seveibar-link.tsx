"use client"

export function SeveibarLink() {
  return (
    <a
      href="https://x.com/seveibar"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="@seveibar on X"
      className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 fill-current"
      >
        <path d="M18.244 2H21.5l-7.11 8.128L22.75 22h-6.544l-5.124-6.717L5.206 22H1.95l7.606-8.694L1.25 2h6.71l4.631 6.155L18.244 2Zm-1.14 18h1.804L6.98 3.895H5.044L17.104 20Z" />
      </svg>
      <span>@seveibar</span>
    </a>
  )
}
