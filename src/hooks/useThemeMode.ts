import { useEffect, useState } from 'react'
import {
  applyTheme,
  getStoredThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from '../lib/theme'

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredThemeMode())

  useEffect(() => {
    applyTheme(mode)
    setStoredThemeMode(mode)

    if (mode !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  return { mode, setMode }
}
