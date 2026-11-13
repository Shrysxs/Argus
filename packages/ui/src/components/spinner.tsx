import { cn } from "@workspace/ui/lib/utils"

function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <svg
      role="status"
      aria-label={label}
      className={cn("size-4 animate-spin text-brass", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export { Spinner }
