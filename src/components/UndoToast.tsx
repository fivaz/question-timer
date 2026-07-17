type UndoToastProps = {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex w-[min(100%-2rem,24.875rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--toast)] px-4 py-3 text-sm text-white shadow-[0_16px_40px_-20px_var(--shell-shadow)]"
      role="status"
      aria-live="polite"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          className="rounded-md px-2.5 py-1.5 font-semibold text-[var(--accent)] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-2 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
