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
    <header className="mb-5 flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
            Study session
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-white/70 hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label="Sign out"
            title={
              userName || userEmail
                ? `Sign out (${userName ?? userEmail})`
                : 'Sign out'
            }
          >
            <LogoutIcon />
          </button>
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Question Timer
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Set your start time and planned question count, then tap each finish
          button as you complete a question. Start a new block anytime to track
          another set below.
        </p>
      </div>

      <button
        type="button"
        onClick={onNewBlock}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
      >
        <PlusIcon />
        Study block
      </button>
    </header>
  )
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17l5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
