import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { AppHeader } from './components/AppHeader'
import { ConfirmDialog } from './components/ConfirmDialog'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { StudyBlockPanel } from './components/StudyBlockPanel'
import { UndoToast } from './components/UndoToast'
import {
  createBlock,
  listBlocks,
  restoreBlock,
  softDeleteBlock,
  updateBlock as persistBlock,
} from './db/studyBlocks'
import { useDebouncedById } from './hooks/useDebouncedById'
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
} from './lib/auth'
import type { StudyBlock } from './types'

type SessionState =
  | { status: 'booting' }
  | { status: 'signedOut' }
  | { status: 'loading'; user: User }
  | { status: 'ready'; user: User }
  | { status: 'error'; message: string; user: User | null }

type PendingDelete = {
  block: StudyBlock
  index: number
}

const UNDO_MS = 8000

export default function App() {
  const [blocks, setBlocks] = useState<StudyBlock[]>([])
  const [session, setSession] = useState<SessionState>({ status: 'booting' })
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return subscribeToAuth((user) => {
      if (!user) {
        setBlocks([])
        setConfirmBlockId(null)
        setPendingDelete(null)
        setSession({ status: 'signedOut' })
        return
      }
      setSession({ status: 'loading', user })
    })
  }, [])

  useEffect(() => {
    if (session.status !== 'loading') return

    let cancelled = false
    const { user } = session

    async function loadBlocks() {
      try {
        let next = await listBlocks()
        if (next.length === 0) {
          const seed = await createBlock(false)
          next = [seed]
        }
        if (!cancelled) {
          setBlocks(next)
          setSession({ status: 'ready', user })
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load study blocks'
        if (!cancelled) setSession({ status: 'error', message, user })
      }
    }

    void loadBlocks()
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  const saveBlock = useCallback(async (_id: string, block: StudyBlock) => {
    try {
      await persistBlock(block)
    } catch (error) {
      console.warn('Failed to save study block', error)
    }
  }, [])

  const debouncedPersist = useDebouncedById(saveBlock, 400)

  function clearUndoToast() {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    setPendingDelete(null)
  }

  async function handleSignIn() {
    setSigningIn(true)
    setSignInError(null)
    try {
      await signInWithGoogle()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Google sign-in failed'
      setSignInError(message)
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    clearUndoToast()
    try {
      await signOutUser()
    } catch (error) {
      console.warn('Failed to sign out', error)
    }
  }

  async function startNewBlock() {
    try {
      const block = await createBlock(true)
      setBlocks((prev) => [block, ...prev])
    } catch (error) {
      console.warn('Failed to create study block', error)
    }
  }

  function handleBlockChange(id: string, next: StudyBlock) {
    setBlocks((prev) => prev.map((block) => (block.id === id ? next : block)))
    debouncedPersist(id, next)
  }

  async function confirmDelete() {
    if (!confirmBlockId) return
    const index = blocks.findIndex((block) => block.id === confirmBlockId)
    const block = index >= 0 ? blocks[index] : null
    setConfirmBlockId(null)
    if (!block || index < 0) return

    clearUndoToast()
    setBlocks((prev) => prev.filter((item) => item.id !== block.id))
    setPendingDelete({ block, index })

    try {
      await softDeleteBlock(block.id)
    } catch (error) {
      console.warn('Failed to soft-delete study block', error)
      setBlocks((prev) => {
        const next = [...prev]
        next.splice(index, 0, block)
        return next
      })
      setPendingDelete(null)
      return
    }

    undoTimerRef.current = setTimeout(() => {
      setPendingDelete(null)
      undoTimerRef.current = null
    }, UNDO_MS)
  }

  async function handleUndo() {
    if (!pendingDelete) return
    const { block, index } = pendingDelete
    clearUndoToast()

    setBlocks((prev) => {
      const next = [...prev]
      const insertAt = Math.min(index, next.length)
      next.splice(insertAt, 0, { ...block, animateEntrance: true })
      return next
    })

    try {
      await restoreBlock(block.id)
    } catch (error) {
      console.warn('Failed to restore study block', error)
      setBlocks((prev) => prev.filter((item) => item.id !== block.id))
    }
  }

  if (session.status === 'booting' || session.status === 'loading') {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-3 px-4 py-8 text-[var(--muted)]">
        <p className="text-sm font-medium">
          {session.status === 'booting'
            ? 'Checking sign-in…'
            : 'Opening study session…'}
        </p>
      </div>
    )
  }

  if (session.status === 'signedOut') {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-5 px-4 py-8 text-center">
        <div>
          <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
            Study session
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Question Timer
          </h1>
          <p className="mt-2 max-w-md text-[var(--muted)]">
            Sign in with Google to save your study blocks in the cloud.
          </p>
        </div>
        <GoogleSignInButton onClick={() => void handleSignIn()} disabled={signingIn} />
        {signInError && (
          <p className="max-w-md text-sm text-red-600">{signInError}</p>
        )}
      </div>
    )
  }

  if (session.status === 'error') {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <h1 className="text-xl font-semibold text-[var(--ink)]">
          Could not load data
        </h1>
        <p className="max-w-md text-sm text-[var(--muted)]">{session.message}</p>
        <p className="max-w-md text-sm text-[var(--muted)]">
          Check your Firebase config in <code className="mono">.env</code>,
          enable Google sign-in, and apply the Firestore rules from the README.
        </p>
        {session.user && (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-2 rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
          >
            Sign out
          </button>
        )}
      </div>
    )
  }

  const { user } = session
  const confirmBlock = blocks.find((block) => block.id === confirmBlockId)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <AppHeader
        onNewBlock={() => void startNewBlock()}
        userName={user.displayName}
        userEmail={user.email}
        onSignOut={() => void handleSignOut()}
      />

      <div className="flex flex-col gap-6">
        {blocks.map((block) => (
          <StudyBlockPanel
            key={block.id}
            block={block}
            onChange={(next) => handleBlockChange(block.id, next)}
            onRequestDelete={() => setConfirmBlockId(block.id)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmBlockId !== null}
        title="Delete study block?"
        message={
          confirmBlock
            ? `This will remove the block started at ${confirmBlock.startTimeValue} (${confirmBlock.questionCount} questions). You can undo right after.`
            : 'This will remove the study block. You can undo right after.'
        }
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirmBlockId(null)}
      />

      {pendingDelete && (
        <UndoToast
          message="Study block deleted."
          onUndo={() => void handleUndo()}
          onDismiss={clearUndoToast}
        />
      )}
    </div>
  )
}
