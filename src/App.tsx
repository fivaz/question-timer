import { useMemo, useState } from 'react'

type QuestionRow = {
  finishedAt: Date | null
}

type Trend = {
  color: string
  arrow: 'up' | 'flat' | 'down'
  label: string
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatHHMM(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function formatDuration(seconds: number) {
  const abs = Math.max(0, Math.round(seconds))
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${m}:${pad2(s)}`
}

function parseTimeInput(value: string): Date | null {
  if (!value) return null
  const [h, m, maybeS] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const now = new Date()
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    Number.isFinite(maybeS) ? maybeS : 0,
    0,
  )
  return date
}

function toTimeInputValue(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function getTrend(currentAvg: number, previousAvg: number | null): Trend {
  if (previousAvg === null || previousAvg === 0) {
    return { color: '#ca8a04', arrow: 'flat', label: 'baseline' }
  }

  const deltaRatio = (currentAvg - previousAvg) / previousAvg

  // Maps relative change onto a red → yellow → green scale.
  // Negative delta (faster) → green; positive (slower) → red.
  const clamped = Math.max(-0.35, Math.min(0.35, deltaRatio))
  const t = (clamped + 0.35) / 0.7 // 0 = green, 0.5 = yellow, 1 = red

  const color = mixRgb(
    { r: 22, g: 163, b: 74 }, // green
    { r: 202, g: 138, b: 4 }, // yellow
    { r: 220, g: 38, b: 38 }, // red
    t,
  )

  if (Math.abs(deltaRatio) < 0.04) {
    return { color, arrow: 'flat', label: 'steady' }
  }
  if (deltaRatio > 0) {
    return { color, arrow: 'up', label: 'slower' }
  }
  return { color, arrow: 'down', label: 'faster' }
}

function mixRgb(
  green: { r: number; g: number; b: number },
  yellow: { r: number; g: number; b: number },
  red: { r: number; g: number; b: number },
  t: number,
) {
  const from = t < 0.5 ? green : yellow
  const to = t < 0.5 ? yellow : red
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2
  const r = Math.round(from.r + (to.r - from.r) * local)
  const g = Math.round(from.g + (to.g - from.g) * local)
  const b = Math.round(from.b + (to.b - from.b) * local)
  return `rgb(${r}, ${g}, ${b})`
}

function TrendArrow({ direction }: { direction: Trend['arrow'] }) {
  if (direction === 'up') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M6 18L18 6M18 6H9M18 6v9"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  if (direction === 'down') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M6 6l12 12M18 18H9M18 18V9"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="M4 12h16M16 8l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function createRows(count: number): QuestionRow[] {
  return Array.from({ length: count }, () => ({ finishedAt: null }))
}

export default function App() {
  const [startTimeValue, setStartTimeValue] = useState(() =>
    toTimeInputValue(new Date()),
  )
  const [questionCount, setQuestionCount] = useState(10)
  const [startNumber, setStartNumber] = useState(1)
  const [rows, setRows] = useState<QuestionRow[]>(() => createRows(10))

  const startDate = useMemo(
    () => parseTimeInput(startTimeValue),
    [startTimeValue],
  )

  const durations = useMemo(() => {
    return rows.map((row, index) => {
      if (!row.finishedAt || !startDate) return null
      const prev =
        index === 0 ? startDate : rows[index - 1]?.finishedAt ?? null
      if (!prev) return null
      return (row.finishedAt.getTime() - prev.getTime()) / 1000
    })
  }, [rows, startDate])

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
    questionCount > 0 ? Math.min(100, (answeredCount / questionCount) * 100) : 0

  function handleQuestionCountChange(next: number) {
    const count = Math.max(1, Math.min(200, next || 1))
    setQuestionCount(count)
    setRows((prev) => {
      if (count === prev.length) return prev
      if (count > prev.length) {
        return [...prev, ...createRows(count - prev.length)]
      }
      return prev.slice(0, count)
    })
  }

  function markFinished(index: number) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { finishedAt: new Date() } : row,
      ),
    )
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
          Study session
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Question Timer
        </h1>
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Set your start time and planned question count, then tap each finish
          button as you complete a question.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_20px_50px_-28px_rgba(26,35,50,0.45)]">
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

        <div className="border-b border-[var(--line)] px-5 py-5 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Started at
              </span>
              <input
                type="time"
                value={startTimeValue}
                onChange={(e) => setStartTimeValue(e.target.value)}
                className="mono rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Questions planned
              </span>
              <input
                type="number"
                min={1}
                max={200}
                value={questionCount}
                onChange={(e) =>
                  handleQuestionCountChange(Number(e.target.value))
                }
                className="mono rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-base text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
              />
            </label>

            <div className="flex flex-col gap-1.5 text-left sm:min-w-[10rem]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Avg / question
              </span>
              <div
                className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
                title={trend.label}
              >
                <span
                  className="mono text-lg font-semibold tabular-nums"
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
            {answeredCount} of {questionCount} answered
            {averageSeconds !== null && previousAverageSeconds !== null
              ? ` · trend ${trend.label}`
              : ''}
          </p>
        </div>

        <div className="grid grid-cols-[4.5rem_1fr_6.5rem] gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)] sm:grid-cols-[5rem_1fr_7rem] sm:px-6">
          <span>#</span>
          <span>Finished</span>
          <span className="text-right">Took</span>
        </div>

        <ul className="divide-y divide-[var(--line)]">
          {rows.map((row, index) => {
            const number = startNumber + index
            const duration = durations[index]
            const isNext =
              answeredCount === index &&
              (index === 0 || rows[index - 1]?.finishedAt !== null)

            return (
              <li
                key={index}
                className={`grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-2 px-5 py-3 sm:grid-cols-[5rem_1fr_7rem] sm:px-6 ${
                  isNext ? 'bg-[var(--accent-soft)]/40' : ''
                }`}
              >
                {index === 0 ? (
                  <input
                    type="number"
                    value={startNumber}
                    onChange={(e) =>
                      setStartNumber(Math.max(0, Number(e.target.value) || 0))
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
    </div>
  )
}
