import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { requireUser } from '../lib/auth'
import { createStudyBlock } from '../lib/studyBlock'
import { getFirestoreDb } from '../lib/firebase'
import type { QuestionRow, StudyBlock } from '../types'

type StoredRow = {
  finishedAt: string | null
}

type StudyBlockDoc = {
  startTimeValue: string
  questionCount: number
  startNumber: number
  rows: StoredRow[]
  deletedAt?: unknown | null
}

function blocksCollection(uid: string) {
  return collection(getFirestoreDb(), 'users', uid, 'studyBlocks')
}

function serializeRows(rows: QuestionRow[]): StoredRow[] {
  return rows.map((row) => ({
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
  }))
}

function deserializeRows(rows: StoredRow[] | undefined): QuestionRow[] {
  if (!rows) return []
  return rows.map((row) => ({
    finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
  }))
}

function isSoftDeleted(data: StudyBlockDoc): boolean {
  return data.deletedAt != null
}

export async function listBlocks(): Promise<StudyBlock[]> {
  const user = requireUser()
  const snapshot = await getDocs(
    query(blocksCollection(user.uid), orderBy('createdAt', 'desc')),
  )

  return snapshot.docs
    .map((document) => {
      const data = document.data() as StudyBlockDoc
      if (isSoftDeleted(data)) return null
      return {
        id: document.id,
        startTimeValue: data.startTimeValue,
        questionCount: data.questionCount,
        startNumber: data.startNumber,
        rows: deserializeRows(data.rows),
        animateEntrance: false,
      } satisfies StudyBlock
    })
    .filter((block): block is StudyBlock => block !== null)
}

export async function createBlock(animateEntrance = false): Promise<StudyBlock> {
  const user = requireUser()
  const block = createStudyBlock(animateEntrance)
  const ref = doc(blocksCollection(user.uid), block.id)

  await setDoc(ref, {
    startTimeValue: block.startTimeValue,
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
    questionCount: block.questionCount,
    startNumber: block.startNumber,
    rows: serializeRows(block.rows),
    updatedAt: serverTimestamp(),
  })
}

/** Soft-delete: sets deletedAt so the block is hidden from listBlocks. */
export async function softDeleteBlock(blockId: string): Promise<void> {
  const user = requireUser()
  const ref = doc(blocksCollection(user.uid), blockId)

  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Clears deletedAt so the block appears in listBlocks again. */
export async function restoreBlock(blockId: string): Promise<void> {
  const user = requireUser()
  const ref = doc(blocksCollection(user.uid), blockId)

  await updateDoc(ref, {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  })
}
