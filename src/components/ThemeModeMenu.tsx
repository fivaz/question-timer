import { useEffect, useId, useRef, useState } from 'react'
import type { ThemeMode } from '../lib/theme'

type ThemeModeMenuProps = {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
}

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function ThemeModeMenu({ mode, onChange }: ThemeModeMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]"
        aria-label="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Theme"
      >
        <ThemeGlyph mode={mode} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Theme mode"
          className="absolute right-0 top-full z-40 mt-1.5 min-w-[9.5rem] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] py-1 shadow-[0_16px_40px_-24px_rgba(26,35,50,0.55)]"
        >
          {OPTIONS.map((option) => {
            const selected = option.value === mode
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--surface)] ${
                  selected
                    ? 'font-semibold text-[var(--accent)]'
                    : 'font-medium text-[var(--ink)]'
                }`}
              >
                <span className="inline-flex size-4 shrink-0 items-center justify-center text-[var(--muted)]">
                  <ThemeGlyph mode={option.value} />
                </span>
                <span className="flex-1">{option.label}</span>
                {selected && (
                  <span className="text-[var(--accent)]" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ThemeGlyph({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="4"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (mode === 'dark') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 20h8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
