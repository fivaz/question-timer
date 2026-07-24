import type { QuestionRow, StudyBlock } from '../types'
import { getDefaultQuestionCount } from './preferences'
import { toTimeInputValue } from './time'

/** Prefer randomUUID; fall back when not in a secure context (e.g. LAN http://192.168.x.x). */
export function createId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // getRandomValues still works on insecure origins; randomUUID does not.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function createRows(count: number, startNumber = 1): QuestionRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: createId(),
    number: startNumber + index,
    finishedAt: null,
  }))
}

/** Next block starts after the previous block's highest finished question #. */
export function nextStartNumberFromPrevious(
  previous: StudyBlock | null | undefined,
): number {
  if (!previous) return 1

  let maxFinished = 0
  for (const row of previous.rows) {
    if (row.finishedAt !== null && row.number > maxFinished) {
      maxFinished = row.number
    }
  }

  return maxFinished > 0 ? maxFinished + 1 : 1
}

export function createStudyBlock(
  animateEntrance = false,
  startNumber = 1,
): StudyBlock {
  const startedAt = new Date()
  const questionCount = getDefaultQuestionCount()
  return {
    id: createId(),
    startTimeValue: toTimeInputValue(startedAt),
    startedAt,
    questionCount,
    startNumber,
    rows: createRows(questionCount, startNumber),
    animateEntrance,
    animateExit: false,
  }
}
