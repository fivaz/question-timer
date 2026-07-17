function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatHHMM(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatDuration(seconds: number) {
  const abs = Math.max(0, Math.round(seconds))
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${m}:${pad2(s)}`
}

export function parseTimeInput(value: string): Date | null {
  if (!value) return null
  const [h, m, maybeS] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const now = new Date()
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    Number.isFinite(maybeS) ? maybeS : 0,
    0,
  )
}

export function toTimeInputValue(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** Apply an `HH:MM` / `HH:MM:SS` time onto an existing date (keeps the calendar day). */
export function applyTimeToDate(base: Date, timeValue: string): Date | null {
  if (!timeValue) return null
  const [h, m, maybeS] = timeValue.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const next = new Date(base)
  next.setHours(h, m, Number.isFinite(maybeS) ? maybeS : 0, 0)
  return next
}
