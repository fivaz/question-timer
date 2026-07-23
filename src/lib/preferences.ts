const STORAGE_KEY = 'question-timer-default-question-count'

export const DEFAULT_QUESTION_COUNT = 10
export const MIN_QUESTION_COUNT = 1
export const MAX_QUESTION_COUNT = 200

export function clampQuestionCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_QUESTION_COUNT
  return Math.max(
    MIN_QUESTION_COUNT,
    Math.min(MAX_QUESTION_COUNT, Math.round(value)),
  )
}

export function getDefaultQuestionCount(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored == null) return DEFAULT_QUESTION_COUNT
    const parsed = Number(stored)
    if (!Number.isFinite(parsed)) return DEFAULT_QUESTION_COUNT
    return clampQuestionCount(parsed)
  } catch {
    return DEFAULT_QUESTION_COUNT
  }
}

export function setDefaultQuestionCount(count: number): number {
  const next = clampQuestionCount(count)
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    // ignore
  }
  return next
}
