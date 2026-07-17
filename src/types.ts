export type QuestionRow = {
  id: string
  number: number
  finishedAt: Date | null
}

export type StudyBlock = {
  id: string
  startTimeValue: string
  questionCount: number
  startNumber: number
  rows: QuestionRow[]
  animateEntrance: boolean
  animateExit: boolean
}

export type Trend = {
  color: string
  arrow: 'up' | 'flat' | 'down'
  label: string
}
