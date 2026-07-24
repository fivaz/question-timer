import { useEffect, useId, useState } from 'react'
import type { ThemeMode } from '../lib/theme'
import {
  clampQuestionCount,
  MAX_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
} from '../lib/preferences'

type ConfigDrawerProps = {
  open: boolean
  onClose: () => void
  defaultQuestionCount: number
  onDefaultQuestionCountChange: (count: number) => void
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function ConfigDrawer({
  open,
  onClose,
  defaultQuestionCount,
  onDefaultQuestionCountChange,
  themeMode,
  onThemeModeChange,
}: ConfigDrawerProps) {
  const titleId = useId()
  const [questionDraft, setQuestionDraft] = useState(
    String(defaultQuestionCount),
  )

  useEffect(() => {
    if (!open) return
    setQuestionDraft(String(defaultQuestionCount))
  }, [open, defaultQuestionCount])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  function commitQuestionCount() {
    const parsed = Number(questionDraft)
    const next = clampQuestionCount(
      Number.isFinite(parsed) ? parsed : defaultQuestionCount,
    )
    setQuestionDraft(String(next))
    onDefaultQuestionCountChange(next)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="config-drawer-sheet w-full max-w-[26.875rem] rounded-t-2xl border border-b-0 border-[var(--line)] bg-[var(--panel)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_50px_-28px_var(--shell-shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)]" aria-hidden />

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--ink)]"
            >
              Settings
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Defaults for new study blocks and appearance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]"
            aria-label="Close settings"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[var(--ink)]">
              Default questions
            </span>
            <span className="text-xs text-[var(--muted)]">
              Used when you start a new study block ({MIN_QUESTION_COUNT}–
              {MAX_QUESTION_COUNT}).
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={questionDraft}
              onChange={(e) =>
                setQuestionDraft(e.target.value.replace(/\D/g, ''))
              }
              onBlur={commitQuestionCount}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="mono h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--input)] px-3 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>

          <fieldset className="flex flex-col gap-2 border-0 p-0">
            <legend className="text-sm font-semibold text-[var(--ink)]">
              Appearance
            </legend>
            <p className="text-xs text-[var(--muted)]">
              Choose light, dark, or follow the system setting.
            </p>
            <div
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Theme mode"
            >
              {THEME_OPTIONS.map((option) => {
                const selected = option.value === themeMode
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onThemeModeChange(option.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] ${
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--line)] bg-[var(--input)] text-[var(--ink)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <span className="text-[var(--muted)]">
                      <ThemeGlyph mode={option.value} />
                    </span>
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Version {__APP_VERSION__}
        </p>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
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
