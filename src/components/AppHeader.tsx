type AppHeaderProps = {
  onNewBlock: () => void
}

export function AppHeader({ onNewBlock }: AppHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
          Study session
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Question Timer
        </h1>
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Set your start time and planned question count, then tap each finish
          button as you complete a question. Start a new block anytime to track
          another set below.
        </p>
      </div>

      <button
        type="button"
        onClick={onNewBlock}
        className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        New study block
      </button>
    </header>
  )
}
