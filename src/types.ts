export type QuestionRow = {
  finishedAt: Date | null
}

export type StudyBlock = {
  id: string
  startTimeValue: string
  questionCount: number
  startNumber: number
  rows: QuestionRow[]
  animateEntrance: boolean
}

export type Trend = {
  color: string
  arrow: 'up' | 'flat' | 'down'
  label: string
}
