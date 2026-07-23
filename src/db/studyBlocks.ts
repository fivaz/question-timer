import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { requireUser } from '../lib/auth'
import { createId, createStudyBlock } from '../lib/studyBlock'
import { getFirestoreDb } from '../lib/firebase'
import { applyTimeToDate, parseTimeInput } from '../lib/time'
import type { QuestionRow, StudyBlock } from '../types'

type StoredRow = {
  id?: string
  number?: number
  finishedAt: string | null
}

type StudyBlockDoc = {
  startTimeValue: string
  /** ISO string when present; legacy docs omit this. */
  startedAt?: string
  questionCount: number
  startNumber: number
  rows: StoredRow[]
  createdAt?: Timestamp | null
  deletedAt?: unknown | null
}

function blocksCollection(uid: string) {
  return collection(getFirestoreDb(), 'users', uid, 'studyBlocks')
}

function serializeRows(rows: QuestionRow[]): StoredRow[] {
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  }))
}

function deserializeRows(
  rows: StoredRow[] | undefined,
  startNumber: number,
): QuestionRow[] {
  if (!rows) return []
  return rows.map((row, index) => ({
    id: typeof row.id === 'string' && row.id ? row.id : createId(),
    number:
      typeof row.number === 'number' && Number.isFinite(row.number)
        ? row.number
        : startNumber + index,
    finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
  }))
}

function isSoftDeleted(data: StudyBlockDoc): boolean {
  return data.deletedAt != null
}

/**
 * Prefer stored startedAt; for legacy docs, apply startTimeValue onto createdAt
 * so Q1 duration keeps the real calendar day. Last resort: today + HH:MM.
 */
function resolveStartedAt(data: StudyBlockDoc): Date {
  if (typeof data.startedAt === 'string' && data.startedAt) {
    const parsed = new Date(data.startedAt)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const createdAt =
    data.createdAt && typeof data.createdAt.toDate === 'function'
      ? data.createdAt.toDate()
      : null
  if (createdAt) {
    const applied = applyTimeToDate(createdAt, data.startTimeValue)
    if (applied) return applied
  }

  return parseTimeInput(data.startTimeValue) ?? new Date()
}

function docToBlock(
  id: string,
  data: StudyBlockDoc,
): StudyBlock | null {
  if (isSoftDeleted(data)) return null
  return {
    id,
    startTimeValue: data.startTimeValue,
    startedAt: resolveStartedAt(data),
    questionCount: data.questionCount,
    startNumber: data.startNumber,
    rows: deserializeRows(data.rows, data.startNumber),
    animateEntrance: false,
    animateExit: false,
  }
}

/**
 * Live study-block list via Firestore onSnapshot.
 * Soft-deleted docs are omitted; callers should treat this as source of truth.
 */
export function subscribeToBlocks(
  onChange: (blocks: StudyBlock[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const user = requireUser()
  const blocksQuery = query(
    blocksCollection(user.uid),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    blocksQuery,
    (snapshot) => {
      const blocks = snapshot.docs
        .map((document) =>
          docToBlock(document.id, document.data() as StudyBlockDoc),
        )
        .filter((block): block is StudyBlock => block !== null)
      onChange(blocks)
    },
    (error) => {
      onError?.(error)
    },
  )
}

export async function createBlock(animateEntrance = false): Promise<StudyBlock> {
  const user = requireUser()
  const block = createStudyBlock(animateEntrance)
  const ref = doc(blocksCollection(user.uid), block.id)

  await setDoc(ref, {
    startTimeValue: block.startTimeValue,
    startedAt: block.startedAt.toISOString(),
    questionCount: block.questionCount,
    startNumber: block.startNumber,
    rows: serializeRows(block.rows),
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return block
}

export async function updateBlock(block: StudyBlock): Promise<void> {
  const user = requireUser()
  const ref = doc(blocksCollection(user.uid), block.id)

  await updateDoc(ref, {
    startTimeValue: block.startTimeValue,
    startedAt: block.startedAt.toISOString(),
    questionCount: block.questionCount,
    startNumber: block.startNumber,
    rows: serializeRows(block.rows),
    updatedAt: serverTimestamp(),
  })
}

/** Soft-delete: sets deletedAt so the block is hidden from subscribeToBlocks. */
export async function softDeleteBlock(blockId: string): Promise<void> {
  const user = requireUser()
  const ref = doc(blocksCollection(user.uid), blockId)

  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Clears deletedAt so the block appears in subscribeToBlocks again. */
export async function restoreBlock(blockId: string): Promise<void> {
  const user = requireUser()
  const ref = doc(blocksCollection(user.uid), blockId)

  await updateDoc(ref, {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  })
}
