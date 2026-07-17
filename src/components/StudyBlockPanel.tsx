import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnimationEvent as ReactAnimationEvent } from 'react'
import { createRows } from '../lib/studyBlock'
import {
  applyTimeToDate,
  formatDuration,
  formatHHMM,
  parseTimeInput,
  toTimeInputValue,
} from '../lib/time'
import { getTrend } from '../lib/trend'
import type { StudyBlock } from '../types'
import { TrendArrow } from './TrendArrow'

type StudyBlockPanelProps = {
  block: StudyBlock
  onChange: (next: StudyBlock) => void
  onRequestDelete: () => void
  onExitComplete?: () => void
}

type SkipAnimation = {
  id: string
  phase: 'out' | 'in'
}

export function StudyBlockPanel({
  block,
  onChange,
  onRequestDelete,
  onExitComplete,
}: StudyBlockPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const blockRef = useRef(block)
  const [skipAnim, setSkipAnim] = useState<SkipAnimation | null>(null)
  const [editingFinishedId, setEditingFinishedId] = useState<string | null>(
    null,
  )
  const [finishedDraft, setFinishedDraft] = useState('')

  blockRef.current = block

  useEffect(() => {
    if (!block.animateExit) return

    const node = rootRef.current
    if (!node) {
      onExitComplete?.()
      return
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) {
      onExitComplete?.()
      return
    }

    function handleEnd(event: AnimationEvent) {
      if (event.target !== node) return
      if (event.animationName !== 'study-block-exit') return
      onExitComplete?.()
    }

    node.addEventListener('animationend', handleEnd)
    return () => node.removeEventListener('animationend', handleEnd)
  }, [block.animateExit, onExitComplete])

  const startDate = useMemo(
    () => parseTimeInput(block.startTimeValue),
    [block.startTimeValue],
  )

  const durations = useMemo(() => {
    return block.rows.map((row, index) => {
      if (!row.finishedAt || !startDate) return null
      const prev =
        index === 0 ? startDate : (block.rows[index - 1]?.finishedAt ?? null)
      if (!prev) return null
      return (row.finishedAt.getTime() - prev.getTime()) / 1000
    })
  }, [block.rows, startDate])

  const answeredCount = durations.filter((d) => d !== null).length

  const averageSeconds = useMemo(() => {
    const valid = durations.filter((d): d is number => d !== null)
    if (valid.length === 0) return null
    return valid.reduce((sum, d) => sum + d, 0) / valid.length
  }, [durations])

  const previousAverageSeconds = useMemo(() => {
    const valid = durations.filter((d): d is number => d !== null)
    if (valid.length < 2) return null
    const withoutLast = valid.slice(0, -1)
    return withoutLast.reduce((sum, d) => sum + d, 0) / withoutLast.length
  }, [durations])

  const trend = useMemo(() => {
    if (averageSeconds === null) {
      return { color: '#94a3b8', arrow: 'flat' as const, label: 'waiting' }
    }
    return getTrend(averageSeconds, previousAverageSeconds)
  }, [averageSeconds, previousAverageSeconds])

  const progress =
    block.questionCount > 0
      ? Math.min(100, (answeredCount / block.questionCount) * 100)
      : 0

  function handleQuestionCountChange(next: number) {
    const count = Math.max(1, Math.min(200, next || 1))
    const rows =
      count === block.rows.length
        ? block.rows
        : count > block.rows.length
          ? [
              ...block.rows,
              ...createRows(
                count - block.rows.length,
                (block.rows.at(-1)?.number ?? block.startNumber - 1) + 1,
              ),
            ]
          : block.rows.slice(0, count)
    onChange({ ...block, questionCount: count, rows })
  }

  function setQuestionNumber(index: number, value: number) {
    const number = Math.max(0, value)
    const noneFinished = block.rows.every((row) => row.finishedAt === null)

    // Before any finishes are recorded, editing #1 renumbers the whole sequence.
    if (index === 0 && noneFinished) {
      onChange({
        ...block,
        startNumber: number,
        rows: block.rows.map((row, i) => ({
          ...row,
          number: number + i,
        })),
      })
      return
    }

    onChange({
      ...block,
      startNumber: index === 0 ? number : block.startNumber,
      rows: block.rows.map((row, i) =>
        i === index ? { ...row, number } : row,
      ),
    })
  }

  function markFinished(index: number) {
    onChange({
      ...block,
      rows: block.rows.map((row, i) =>
        i === index ? { ...row, finishedAt: new Date() } : row,
      ),
    })
  }

  function beginEditFinished(rowId: string, finishedAt: Date | null) {
    const base = finishedAt ?? new Date()
    setFinishedDraft(toTimeInputValue(base))
    setEditingFinishedId(rowId)
  }

  function commitFinishedTime(index: number, timeValue: string) {
    const row = block.rows[index]
    if (!row) {
      setEditingFinishedId(null)
      return
    }
    const base = row.finishedAt ?? new Date()
    const next = applyTimeToDate(base, timeValue)
    setEditingFinishedId(null)
    if (!next) return
    onChange({
      ...block,
      rows: block.rows.map((item, i) =>
        i === index ? { ...item, finishedAt: next } : item,
      ),
    })
  }

  function commitSkip(rowId: string) {
    const current = blockRef.current
    const index = current.rows.findIndex((row) => row.id === rowId)
    const row = index >= 0 ? current.rows[index] : null
    if (!row || row.finishedAt || index >= current.rows.length - 1) {
      setSkipAnim(null)
      return
    }

    const nextRows = [
      ...current.rows.slice(0, index),
      ...current.rows.slice(index + 1),
      row,
    ]

    onChange({
      ...current,
      startNumber: nextRows[0]?.number ?? current.startNumber,
      rows: nextRows,
    })
  }

  function skipQuestion(index: number) {
    const row = block.rows[index]
    if (!row || row.finishedAt || index >= block.rows.length - 1) return
    if (skipAnim) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) {
      commitSkip(row.id)
      return
    }

    setSkipAnim({ id: row.id, phase: 'out' })
  }

  function handleRowAnimationEnd(
    rowId: string,
    event: ReactAnimationEvent<HTMLLIElement>,
  ) {
    if (event.target !== event.currentTarget) return
    if (!skipAnim || skipAnim.id !== rowId) return

    if (skipAnim.phase === 'out' && event.animationName === 'question-skip-out') {
      commitSkip(rowId)
      setSkipAnim({ id: rowId, phase: 'in' })
      return
    }

    if (skipAnim.phase === 'in' && event.animationName === 'question-skip-in') {
      setSkipAnim(null)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_20px_50px_-28px_rgba(26,35,50,0.45)] ${
        block.animateExit
          ? 'study-block-exit'
          : block.animateEntrance
            ? 'study-block-enter'
            : ''
      }`}
    >
      <div className="h-2 w-full bg-[#e8eef4]">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Questions answered progress"
        />
      </div>

      <div className="border-b border-[var(--line)] px-4 py-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-left text-sm font-medium text-[var(--ink)]">
            Study block
          </p>
          <button
            type="button"
            onClick={onRequestDelete}
            className="shrink-0 rounded-lg border border-[var(--line)] bg-[var(--input)] px-3 py-1.5 text-sm font-semibold text-[var(--danger)] transition hover:border-[var(--danger-line)] hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)]"
          >
            Delete
          </button>
        </div>
        <div className="flex items-end justify-around gap-3">
          <label className="flex w-[6.5rem] shrink-0 flex-col gap-1 text-center">
            <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Started at
            </span>
            <input
              type="time"
              value={block.startTimeValue}
              onChange={(e) =>
                onChange({ ...block, startTimeValue: e.target.value })
              }
              className="time-input mono w-full rounded-lg border border-[var(--line)] bg-[var(--input)] px-1.5 text-center text-sm text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>

          <label className="flex w-[4.5rem] shrink-0 flex-col gap-1 text-center">
            <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Questions
            </span>
            <input
              type="number"
              min={1}
              max={200}
              value={block.questionCount}
              onChange={(e) =>
                handleQuestionCountChange(Number(e.target.value))
              }
              className="mono h-[2.375rem] w-full rounded-lg border border-[var(--line)] bg-[var(--input)] px-1.5 text-center text-sm text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>

          <div className="flex w-[6.5rem] shrink-0 flex-col gap-1 text-center">
            <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Avg / q
            </span>
            <div
              className="flex h-[2.375rem] items-center justify-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-1.5"
              title={trend.label}
            >
              <span
                className="mono min-w-0 truncate text-sm font-semibold tabular-nums"
                style={{ color: trend.color }}
              >
                {averageSeconds === null
                  ? '--:--'
                  : formatDuration(averageSeconds)}
              </span>
              <span style={{ color: trend.color }} className="shrink-0">
                <TrendArrow direction={trend.arrow} />
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-left text-sm text-[var(--muted)]">
          {answeredCount} of {block.questionCount} answered
          {averageSeconds !== null && previousAverageSeconds !== null
            ? ` · trend ${trend.label}`
            : ''}
        </p>
      </div>

      <div className="grid grid-cols-[3.75rem_minmax(0,1fr)_3.75rem_2.75rem] items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] sm:px-6">
        <span className="text-center">#</span>
        <span className="text-center">Finished</span>
        <span className="text-center">Took</span>
        <span className="text-center">Skip</span>
      </div>

      <ul className="divide-y divide-[var(--line)]">
        {block.rows.map((row, index) => {
          const duration = durations[index]
          const isNext =
            answeredCount === index &&
            (index === 0 || block.rows[index - 1]?.finishedAt !== null)
          const canSkip =
            !skipAnim &&
            !row.finishedAt &&
            index < block.rows.length - 1
          const skipClass =
            skipAnim?.id === row.id
              ? skipAnim.phase === 'out'
                ? 'question-skip-out'
                : 'question-skip-in'
              : ''

          return (
            <li
              key={row.id}
              onAnimationEnd={(event) => handleRowAnimationEnd(row.id, event)}
              className={`grid grid-cols-[3.75rem_minmax(0,1fr)_3.75rem_2.75rem] items-center gap-2 px-4 py-2.5 sm:px-6 ${
                isNext ? 'bg-[var(--accent-soft)]/40' : ''
              } ${skipClass}`}
            >
              <input
                type="number"
                value={row.number}
                onChange={(e) =>
                  setQuestionNumber(index, Number(e.target.value) || 0)
                }
                className="mono w-full rounded-md border border-[var(--line)] bg-[var(--input)] px-2 py-1.5 text-center text-sm font-medium text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
                aria-label={`Question number ${row.number}`}
              />

              {editingFinishedId === row.id ? (
                <input
                  type="time"
                  autoFocus
                  value={finishedDraft}
                  onChange={(e) => setFinishedDraft(e.target.value)}
                  onBlur={() => commitFinishedTime(index, finishedDraft)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                    if (e.key === 'Escape') {
                      setEditingFinishedId(null)
                    }
                  }}
                  className="time-input finished-time-input mono justify-self-center w-[6.5rem] rounded-md border border-[var(--accent)] bg-[var(--input)] px-1.5 text-center text-xs font-medium tabular-nums text-[var(--accent)] outline-none ring-[var(--accent)] focus:ring-2"
                  aria-label={`Edit finished time for question ${row.number}`}
                />
              ) : (
                <FinishedButton
                  finishedAt={row.finishedAt}
                  questionNumber={row.number}
                  onTap={() => markFinished(index)}
                  onLongPress={() =>
                    beginEditFinished(row.id, row.finishedAt)
                  }
                />
              )}

              <span className="mono text-center text-sm tabular-nums text-[var(--ink)]">
                {duration === null ? '—' : formatDuration(duration)}
              </span>

              <button
                type="button"
                onClick={() => skipQuestion(index)}
                disabled={!canSkip || skipAnim !== null}
                className="inline-flex size-8 justify-self-center items-center justify-center rounded-md border border-[var(--line)] bg-[var(--input)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--line)] disabled:hover:text-[var(--muted)]"
                aria-label={`Skip question ${row.number}`}
                title={
                  row.finishedAt
                    ? 'Already finished'
                    : canSkip
                      ? 'Move to end'
                      : 'Already last'
                }
              >
                <SkipIcon />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FinishedButton({
  finishedAt,
  questionNumber,
  onTap,
  onLongPress,
}: {
  finishedAt: Date | null
  questionNumber: number
  onTap: () => void
  onLongPress: () => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressedRef = useRef(false)

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handlePointerDown() {
    longPressedRef.current = false
    clearTimer()
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true
      onLongPress()
    }, 480)
  }

  function handlePointerUp() {
    clearTimer()
  }

  function handleClick() {
    if (longPressedRef.current) {
      longPressedRef.current = false
      return
    }
    onTap()
  }

  useEffect(() => () => clearTimer(), [])

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      title={
        finishedAt
          ? 'Tap to set now · Long-press to edit time'
          : 'Tap when done · Long-press to enter a time'
      }
      aria-label={
        finishedAt
          ? `Finished at ${formatHHMM(finishedAt)}. Long-press to edit.`
          : `Mark question ${questionNumber} finished. Long-press to enter a time.`
      }
      className={`mono justify-self-center select-none rounded-md border px-2.5 py-1 text-center text-xs font-medium tabular-nums transition touch-manipulation ${
        finishedAt
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'border-dashed border-[var(--line)] bg-[var(--input)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
      }`}
    >
      {finishedAt ? formatHHMM(finishedAt) : 'Tap when done'}
    </button>
  )
}

function SkipIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M5 4l10 8-10 8V4z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M19 5v14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
