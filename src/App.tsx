import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { StudyBlockPanel } from './components/StudyBlockPanel'
import { createStudyBlock } from './lib/studyBlock'
import type { StudyBlock } from './types'

export default function App() {
  const [blocks, setBlocks] = useState<StudyBlock[]>(() => [createStudyBlock()])

  function startNewBlock() {
    // Prepend so newer blocks appear first in the vertical stack.
    setBlocks((prev) => [createStudyBlock(true), ...prev])
  }

  function updateBlock(id: string, next: StudyBlock) {
    setBlocks((prev) => prev.map((block) => (block.id === id ? next : block)))
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <AppHeader onNewBlock={startNewBlock} />

      <div className="flex flex-col gap-6">
        {blocks.map((block) => (
          <StudyBlockPanel
            key={block.id}
            block={block}
            onChange={(next) => updateBlock(block.id, next)}
          />
        ))}
      </div>
    </div>
  )
}
