import { useEffect, useMemo, useRef } from 'react'
import { createRows } from '../lib/studyBlock'
import {
  formatDuration,
  formatHHMM,
  parseTimeInput,
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

export function StudyBlockPanel({
  block,
  onChange,
  onRequestDelete,
  onExitComplete,
}: StudyBlockPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null)

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
          ? [...block.rows, ...createRows(count - block.rows.length)]
          : block.rows.slice(0, count)
    onChange({ ...block, questionCount: count, rows })
  }

  function markFinished(index: number) {
    onChange({
      ...block,
      rows: block.rows.map((row, i) =>
        i === index ? { finishedAt: new Date() } : row,
      ),
    })
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
            className="shrink-0 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-[#b91c1c] transition hover:border-[#fecaca] hover:bg-[#fef2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:ring-offset-2"
          >
            Delete
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex min-w-0 flex-col gap-1 text-left">
            <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Started at
            </span>
            <input
              type="time"
              value={block.startTimeValue}
              onChange={(e) =>
                onChange({ ...block, startTimeValue: e.target.value })
              }
              className="mono w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-1.5 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1 text-left">
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
              className="mono w-full min-w-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-1.5 py-2 text-sm text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            />
          </label>

          <div className="flex min-w-0 flex-col gap-1 text-left">
            <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Avg / q
            </span>
            <div
              className="flex min-h-[2.375rem] items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-1.5 py-2"
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

      <div className="grid grid-cols-[3.5rem_1fr_4.75rem] gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        <span>#</span>
        <span>Finished</span>
        <span className="text-right">Took</span>
      </div>

      <ul className="divide-y divide-[var(--line)]">
        {block.rows.map((row, index) => {
          const number = block.startNumber + index
          const duration = durations[index]
          const isNext =
            answeredCount === index &&
            (index === 0 || block.rows[index - 1]?.finishedAt !== null)

          return (
            <li
              key={index}
              className={`grid grid-cols-[3.5rem_1fr_4.75rem] items-center gap-2 px-4 py-3 ${
                isNext ? 'bg-[var(--accent-soft)]/40' : ''
              }`}
            >
              {index === 0 ? (
                <input
                  type="number"
                  value={block.startNumber}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      startNumber: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="mono w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-center text-sm font-medium outline-none ring-[var(--accent)] focus:ring-2"
                  aria-label="Starting question number"
                />
              ) : (
                <span className="mono text-center text-sm font-medium tabular-nums text-[var(--ink)]">
                  {number}
                </span>
              )}

              <button
                type="button"
                onClick={() => markFinished(index)}
                className={`mono rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                  row.finishedAt
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-dashed border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {row.finishedAt ? formatHHMM(row.finishedAt) : 'Tap when done'}
              </button>

              <span className="mono text-right text-sm tabular-nums text-[var(--ink)]">
                {duration === null ? '—' : formatDuration(duration)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
