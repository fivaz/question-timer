import { useCallback, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { AppHeader } from './components/AppHeader'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { StudyBlockPanel } from './components/StudyBlockPanel'
import {
  createBlock,
  listBlocks,
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

export default function App() {
  const [blocks, setBlocks] = useState<StudyBlock[]>([])
  const [session, setSession] = useState<SessionState>({ status: 'booting' })
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  useEffect(() => {
    return subscribeToAuth((user) => {
      if (!user) {
        setBlocks([])
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

  const saveBlock = useCallback(async (_id: string, block: StudyBlock) => {
    try {
      await persistBlock(block)
    } catch (error) {
      console.warn('Failed to save study block', error)
    }
  }, [])

  const debouncedPersist = useDebouncedById(saveBlock, 400)

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
          />
        ))}
      </div>
    </div>
  )
}
