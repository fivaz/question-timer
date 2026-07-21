import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnimationEvent as ReactAnimationEvent, CSSProperties } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createRows } from '../lib/studyBlock'
import {
  applyTimeToDate,
  formatDuration,
  formatHHMM,
  parseTimeInput,
  toTimeInputValue,
} from '../lib/time'
import { getTrend } from '../lib/trend'
import type { QuestionRow, StudyBlock } from '../types'
import { TrendArrow } from './TrendArrow'

const ROW_GRID =
  'grid grid-cols-[1.75rem_3.5rem_minmax(0,1fr)_3.5rem_2.75rem] items-center gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-5'

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

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
  const blockRef = useRef(block)
  const [exitingRowId, setExitingRowId] = useState<string | null>(null)
  const [editingFinishedId, setEditingFinishedId] = useState<string | null>(
    null,
  )
  const [finishedDraft, setFinishedDraft] = useState('')
  const [questionCountDraft, setQuestionCountDraft] = useState<string | null>(
    null,
  )

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

    if (count === block.rows.length) {
      onChange({ ...block, questionCount: count })
      return
    }

    if (count > block.rows.length) {
      onChange({
        ...block,
        questionCount: count,
        rows: [
          ...block.rows,
          ...createRows(
            count - block.rows.length,
            (block.rows.at(-1)?.number ?? block.startNumber - 1) + 1,
          ),
        ],
      })
      return
    }

    // Shrinking: drop unfinished rows from the end first; never erase timed rows.
    const nextRows = [...block.rows]
    while (nextRows.length > count) {
      let removeAt = -1
      for (let i = nextRows.length - 1; i >= 0; i--) {
        if (nextRows[i]?.finishedAt === null) {
          removeAt = i
          break
        }
      }
      if (removeAt < 0) break
      nextRows.splice(removeAt, 1)
    }

    onChange({
      ...block,
      questionCount: nextRows.length,
      startNumber: nextRows[0]?.number ?? block.startNumber,
      rows: nextRows,
    })
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

  function commitDeleteRow(rowId: string) {
    const current = blockRef.current
    if (current.rows.length <= 1) {
      setExitingRowId(null)
      return
    }

    const nextRows = current.rows.filter((row) => row.id !== rowId)
    if (nextRows.length === current.rows.length) {
      setExitingRowId(null)
      return
    }

    if (editingFinishedId === rowId) {
      setEditingFinishedId(null)
    }

    setExitingRowId(null)
    onChange({
      ...current,
      questionCount: nextRows.length,
      startNumber: nextRows[0]?.number ?? current.startNumber,
      rows: nextRows,
    })
  }

  function deleteQuestion(index: number) {
    const row = block.rows[index]
    if (!row || block.rows.length <= 1 || exitingRowId) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (reducedMotion) {
      commitDeleteRow(row.id)
      return
    }

    setExitingRowId(row.id)
  }

  function handleRowAnimationEnd(
    rowId: string,
    event: ReactAnimationEvent<HTMLLIElement>,
  ) {
    if (event.target !== event.currentTarget) return
    if (exitingRowId !== rowId) return
    if (event.animationName !== 'question-row-exit') return
    commitDeleteRow(rowId)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const rowIds = useMemo(() => block.rows.map((row) => row.id), [block.rows])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = block.rows.findIndex((row) => row.id === active.id)
    const newIndex = block.rows.findIndex((row) => row.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const nextRows = arrayMove(block.rows, oldIndex, newIndex)
    onChange({
      ...block,
      startNumber: nextRows[0]?.number ?? block.startNumber,
      rows: nextRows,
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={questionCountDraft ?? String(block.questionCount)}
              onFocus={() => setQuestionCountDraft(String(block.questionCount))}
              onChange={(e) => setQuestionCountDraft(digitsOnly(e.target.value))}
              onBlur={() => {
                const draft = questionCountDraft
                setQuestionCountDraft(null)
                if (draft === null || draft === '') return
                handleQuestionCountChange(Number(draft))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
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

      <div
        className={`${ROW_GRID} border-b border-[var(--line)] bg-[var(--surface)] text-xs font-semibold uppercase tracking-wider text-[var(--muted)]`}
        role="row"
      >
        <span aria-hidden className="size-7" />
        <span className="text-center">#</span>
        <span className="text-center">Finished</span>
        <span className="text-center">Took</span>
        <span aria-hidden className="size-8" />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-[var(--line)]">
            {block.rows.map((row, index) => {
              const duration = durations[index]
              const isNext =
                answeredCount === index &&
                (index === 0 || block.rows[index - 1]?.finishedAt !== null)
              const canDelete =
                !exitingRowId && block.rows.length > 1
              const exitClass =
                exitingRowId === row.id ? 'question-row-exit' : ''

              return (
                <SortableQuestionRow
                  key={row.id}
                  row={row}
                  duration={duration}
                  isNext={isNext}
                  canDelete={canDelete}
                  exitClass={exitClass}
                  dragDisabled={exitingRowId !== null}
                  editingFinished={editingFinishedId === row.id}
                  finishedDraft={finishedDraft}
                  onAnimationEnd={(event) =>
                    handleRowAnimationEnd(row.id, event)
                  }
                  onNumberChange={(value) => setQuestionNumber(index, value)}
                  onMarkFinished={() => markFinished(index)}
                  onBeginEditFinished={() =>
                    beginEditFinished(row.id, row.finishedAt)
                  }
                  onFinishedDraftChange={setFinishedDraft}
                  onCommitFinishedTime={() =>
                    commitFinishedTime(index, finishedDraft)
                  }
                  onCancelFinishedEdit={() => setEditingFinishedId(null)}
                  onDelete={() => deleteQuestion(index)}
                />
              )
            })}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

type SortableQuestionRowProps = {
  row: QuestionRow
  duration: number | null | undefined
  isNext: boolean
  canDelete: boolean
  exitClass: string
  dragDisabled: boolean
  editingFinished: boolean
  finishedDraft: string
  onAnimationEnd: (event: ReactAnimationEvent<HTMLLIElement>) => void
  onNumberChange: (value: number) => void
  onMarkFinished: () => void
  onBeginEditFinished: () => void
  onFinishedDraftChange: (value: string) => void
  onCommitFinishedTime: () => void
  onCancelFinishedEdit: () => void
  onDelete: () => void
}

function SortableQuestionRow({
  row,
  duration,
  isNext,
  canDelete,
  exitClass,
  dragDisabled,
  editingFinished,
  finishedDraft,
  onAnimationEnd,
  onNumberChange,
  onMarkFinished,
  onBeginEditFinished,
  onFinishedDraftChange,
  onCommitFinishedTime,
  onCancelFinishedEdit,
  onDelete,
}: SortableQuestionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    disabled: dragDisabled,
  })

  const [numberDraft, setNumberDraft] = useState<string | null>(null)

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : undefined,
    position: isDragging ? 'relative' : undefined,
    opacity: isDragging ? 0.92 : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      onAnimationEnd={onAnimationEnd}
      className={`${ROW_GRID} ${
        isNext ? 'bg-[var(--accent-soft)]/40' : ''
      } ${isDragging ? 'bg-[var(--panel)] shadow-md' : ''} ${exitClass}`}
    >
      <button
        type="button"
        className="inline-flex size-7 touch-manipulation items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Reorder question ${row.number}`}
        title="Drag to reorder"
        disabled={dragDisabled}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={numberDraft ?? String(row.number)}
        onFocus={() => setNumberDraft(String(row.number))}
        onChange={(e) => setNumberDraft(digitsOnly(e.target.value))}
        onBlur={() => {
          const draft = numberDraft
          setNumberDraft(null)
          if (draft === null || draft === '') return
          onNumberChange(Number(draft))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="mono w-full rounded-md border border-[var(--line)] bg-[var(--input)] px-2 py-1.5 text-center text-sm font-medium text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
        aria-label={`Question number ${row.number}`}
      />

      {editingFinished ? (
        <input
          type="time"
          autoFocus
          value={finishedDraft}
          onChange={(e) => onFinishedDraftChange(e.target.value)}
          onBlur={onCommitFinishedTime}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
            if (e.key === 'Escape') {
              onCancelFinishedEdit()
            }
          }}
          className="time-input finished-time-input mono justify-self-center w-[6.5rem] rounded-md border border-[var(--accent)] bg-[var(--input)] px-1.5 text-center text-xs font-medium tabular-nums text-[var(--accent)] outline-none ring-[var(--accent)] focus:ring-2"
          aria-label={`Edit finished time for question ${row.number}`}
        />
      ) : (
        <FinishedButton
          finishedAt={row.finishedAt}
          questionNumber={row.number}
          onTap={onMarkFinished}
          onLongPress={onBeginEditFinished}
        />
      )}

      <span className="mono text-center text-sm tabular-nums text-[var(--ink)]">
        {duration == null ? '—' : formatDuration(duration)}
      </span>

      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete || dragDisabled}
        className="inline-flex size-8 justify-self-center items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ring-offset)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--muted)]"
        aria-label={`Delete question ${row.number}`}
        title={canDelete ? 'Delete question' : 'Keep at least one question'}
      >
        <CloseIcon />
      </button>
    </li>
  )
}

function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="5" cy="3.5" r="1.25" />
      <circle cx="11" cy="3.5" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12.5" r="1.25" />
      <circle cx="11" cy="12.5" r="1.25" />
    </svg>
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

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
