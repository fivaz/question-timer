type AppHeaderProps = {
  onNewBlock: () => void
  userName: string | null
  userEmail: string | null
  onSignOut: () => void
}

export function AppHeader({
  onNewBlock,
  userName,
  userEmail,
  onSignOut,
}: AppHeaderProps) {
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

      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onNewBlock}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            New study block
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            Sign out
          </button>
        </div>
        {(userName || userEmail) && (
          <p className="text-right text-sm text-[var(--muted)]">
            Signed in as {userName ?? userEmail}
          </p>
        )}
      </div>
    </header>
  )
}
