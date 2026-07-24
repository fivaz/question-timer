import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { AppHeader } from './components/AppHeader'
import { ConfigDrawer } from './components/ConfigDrawer'
import { ConfirmDialog } from './components/ConfirmDialog'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { StudyBlockPanel } from './components/StudyBlockPanel'
import { ThemeModeMenu } from './components/ThemeModeMenu'
import { UndoToast } from './components/UndoToast'
import {
  createBlock,
  restoreBlock,
  softDeleteBlock,
  subscribeToBlocks,
  updateBlock as persistBlock,
} from './db/studyBlocks'
import { useDebouncedById } from './hooks/useDebouncedById'
import { useThemeMode } from './hooks/useThemeMode'
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
} from './lib/auth'
import {
  getDefaultQuestionCount,
  setDefaultQuestionCount,
} from './lib/preferences'
import { nextStartNumberFromPrevious } from './lib/studyBlock'
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

/** Merge Firestore snapshot with local UI state (dirty edits + exit animations). */
function mergeRemoteBlocks(
  prev: StudyBlock[],
  remote: StudyBlock[],
  dirtyIds: Set<string>,
): StudyBlock[] {
  const prevById = new Map(prev.map((block) => [block.id, block]))
  const remoteIds = new Set(remote.map((block) => block.id))

  const merged = remote.map((remoteBlock) => {
    const local = prevById.get(remoteBlock.id)
    if (dirtyIds.has(remoteBlock.id) && local) {
      return local
    }
    return {
      ...remoteBlock,
      animateEntrance: local?.animateEntrance ?? false,
      animateExit: local?.animateExit ?? false,
    }
  })

  for (const local of prev) {
    if (!local.animateExit || remoteIds.has(local.id)) continue

    const prevIndex = prev.findIndex((block) => block.id === local.id)
    let insertAt = 0
    for (let i = prevIndex - 1; i >= 0; i--) {
      const neighborId = prev[i]!.id
      const at = merged.findIndex((block) => block.id === neighborId)
      if (at >= 0) {
        insertAt = at + 1
        break
      }
    }
    if (!merged.some((block) => block.id === local.id)) {
      merged.splice(insertAt, 0, local)
    }
  }

  return merged
}

export default function App() {
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode()
  const [defaultQuestionCount, setDefaultQuestionCountState] = useState(() =>
    getDefaultQuestionCount(),
  )
  const [configOpen, setConfigOpen] = useState(false)
  const [blocks, setBlocks] = useState<StudyBlock[]>([])
  const [session, setSession] = useState<SessionState>({ status: 'booting' })
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitPendingRef = useRef<PendingDelete | null>(null)
  const dirtyIdsRef = useRef(new Set<string>())
  const seedRequestedRef = useRef(false)

  useEffect(() => {
    return subscribeToAuth((user) => {
      if (!user) {
        setBlocks([])
        setConfirmBlockId(null)
        setConfirmSignOut(false)
        setConfigOpen(false)
        setPendingDelete(null)
        exitPendingRef.current = null
        dirtyIdsRef.current.clear()
        seedRequestedRef.current = false
        setSession({ status: 'signedOut' })
        return
      }
      seedRequestedRef.current = false
      setSession({ status: 'loading', user })
    })
  }, [])

  const syncUserId =
    session.status === 'loading' || session.status === 'ready'
      ? session.user.uid
      : null

  useEffect(() => {
    if (!syncUserId) return

    let cancelled = false

    const unsubscribe = subscribeToBlocks(
      (remoteBlocks) => {
        if (cancelled) return

        if (remoteBlocks.length === 0 && !seedRequestedRef.current) {
          seedRequestedRef.current = true
          void createBlock(false).catch((error) => {
            seedRequestedRef.current = false
            console.warn('Failed to seed study block', error)
          })
        }

        setBlocks((prev) =>
          mergeRemoteBlocks(prev, remoteBlocks, dirtyIdsRef.current),
        )
        setSession((current) => {
          if (current.status !== 'loading') return current
          return { status: 'ready', user: current.user }
        })
      },
      (error) => {
        if (cancelled) return
        setSession((current) => ({
          status: 'error',
          message: error.message || 'Failed to sync study blocks',
          user:
            current.status === 'loading' || current.status === 'ready'
              ? current.user
              : null,
        }))
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [syncUserId])

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  const saveBlock = useCallback(async (id: string, block: StudyBlock) => {
    try {
      await persistBlock(block)
      dirtyIdsRef.current.delete(id)
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
    setConfirmSignOut(false)
    clearUndoToast()
    try {
      await signOutUser()
    } catch (error) {
      console.warn('Failed to sign out', error)
    }
  }

  async function startNewBlock() {
    try {
      // Newest block is first; continue numbering after its highest finished #.
      const startNumber = nextStartNumberFromPrevious(blocks[0])
      const block = await createBlock(true, startNumber)
      setBlocks((prev) =>
        prev.some((item) => item.id === block.id) ? prev : [block, ...prev],
      )
    } catch (error) {
      console.warn('Failed to create study block', error)
    }
  }

  function handleDefaultQuestionCountChange(count: number) {
    setDefaultQuestionCountState(setDefaultQuestionCount(count))
  }

  function handleBlockChange(id: string, next: StudyBlock) {
    dirtyIdsRef.current.add(id)
    setBlocks((prev) => prev.map((block) => (block.id === id ? next : block)))
    debouncedPersist(id, next)
  }

  async function confirmDelete() {
    if (!confirmBlockId) return
    const index = blocks.findIndex((block) => block.id === confirmBlockId)
    const block = index >= 0 ? blocks[index] : null
    setConfirmBlockId(null)
    if (!block || index < 0 || block.animateExit) return

    clearUndoToast()
    exitPendingRef.current = { block, index }
    setBlocks((prev) =>
      prev.map((item) =>
        item.id === block.id ? { ...item, animateExit: true } : item,
      ),
    )

    try {
      await softDeleteBlock(block.id)
    } catch (error) {
      console.warn('Failed to soft-delete study block', error)
      exitPendingRef.current = null
      setBlocks((prev) =>
        prev.map((item) =>
          item.id === block.id ? { ...item, animateExit: false } : item,
        ),
      )
    }
  }

  function finishExit(blockId: string) {
    const pending = exitPendingRef.current
    if (!pending || pending.block.id !== blockId) return
    exitPendingRef.current = null

    setBlocks((prev) => prev.filter((item) => item.id !== blockId))
    setPendingDelete({
      block: {
        ...pending.block,
        animateExit: false,
        animateEntrance: false,
      },
      index: pending.index,
    })

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
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
      next.splice(insertAt, 0, {
        ...block,
        animateEntrance: true,
        animateExit: false,
      })
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
      <div className="app-shell items-center justify-center gap-3 px-4 py-8 text-[var(--muted)]">
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
      <div className="app-shell relative items-center justify-center gap-5 px-4 py-8 text-center">
        <div className="absolute right-4 top-4">
          <ThemeModeMenu mode={themeMode} onChange={setThemeMode} />
        </div>
        <div>
          <p className="text-sm font-medium tracking-wide text-[var(--accent)]">
            Study session
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Question Timer
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Sign in with Google to save your study blocks in the cloud.
          </p>
        </div>
        <GoogleSignInButton onClick={() => void handleSignIn()} disabled={signingIn} />
        {signInError && (
          <p className="text-sm text-[var(--danger)]">{signInError}</p>
        )}
      </div>
    )
  }

  if (session.status === 'error') {
    return (
      <div className="app-shell relative items-center justify-center gap-3 px-4 py-8 text-center">
        <div className="absolute right-4 top-4">
          <ThemeModeMenu mode={themeMode} onChange={setThemeMode} />
        </div>
        <h1 className="text-xl font-semibold text-[var(--ink)]">
          Could not load data
        </h1>
        <p className="text-sm text-[var(--muted)]">{session.message}</p>
        <p className="text-sm text-[var(--muted)]">
          Check your Firebase config in <code className="mono">.env</code>,
          enable Google sign-in, and apply the Firestore rules from the README.
        </p>
        {session.user && (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--input)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]"
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
    <div className="app-shell">
      <div className="app-shell-scroll flex flex-col px-4 py-6">
        <AppHeader
          onNewBlock={() => void startNewBlock()}
          onOpenConfig={() => setConfigOpen(true)}
          userName={user.displayName}
          userEmail={user.email}
          onSignOut={() => setConfirmSignOut(true)}
        />

        <div className="flex flex-col gap-5 pb-4">
          {blocks.map((block) => (
            <StudyBlockPanel
              key={block.id}
              block={block}
              onChange={(next) => handleBlockChange(block.id, next)}
              onRequestDelete={() => setConfirmBlockId(block.id)}
              onExitComplete={
                block.animateExit ? () => finishExit(block.id) : undefined
              }
            />
          ))}
        </div>
      </div>

      <ConfigDrawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        defaultQuestionCount={defaultQuestionCount}
        onDefaultQuestionCountChange={handleDefaultQuestionCountChange}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />

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

      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out?"
        message="You will need to sign in with Google again to access your study blocks."
        confirmLabel="Sign out"
        tone="accent"
        onConfirm={() => void handleSignOut()}
        onCancel={() => setConfirmSignOut(false)}
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
