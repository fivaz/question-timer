import type { QuestionRow, StudyBlock } from '../types'
import { toTimeInputValue } from './time'

export function createRows(count: number): QuestionRow[] {
  return Array.from({ length: count }, () => ({ finishedAt: null }))
}

export function createStudyBlock(animateEntrance = false): StudyBlock {
  return {
    id: crypto.randomUUID(),
    startTimeValue: toTimeInputValue(new Date()),
    questionCount: 10,
    startNumber: 1,
    rows: createRows(10),
    animateEntrance,
  }
}
