import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { LiquidGlass } from '@ybouane/liquidglass'
import { TAB_PILL_GLASS } from './config'

interface LiquidGlassContextValue {
  refresh: () => Promise<void>
  enabled: boolean
}

const LiquidGlassContext = createContext<LiquidGlassContextValue>({
  refresh: async () => {},
  enabled: false,
})

export function useLiquidGlass() {
  return useContext(LiquidGlassContext)
}

function prefersReducedGlass() {
  return window.matchMedia('(prefers-reduced-transparency: reduce)').matches
}

export function LiquidGlassProvider({
  shellRef,
  children,
}: {
  shellRef: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const instanceRef = useRef<LiquidGlass | null>(null)
  const [enabled, setEnabled] = useState(false)

  const refresh = useCallback(async () => {
    const shell = shellRef.current
    if (!shell || prefersReducedGlass()) {
      shell?.classList.remove('liquid-glass-active')
      instanceRef.current?.destroy()
      instanceRef.current = null
      setEnabled(false)
      return
    }

    const glassElements = Array.from(shell.querySelectorAll<HTMLElement>('.liquid-glass-panel'))
    if (!glassElements.length) return

    instanceRef.current?.destroy()

    try {
      instanceRef.current = await LiquidGlass.init({
        root: shell,
        glassElements,
        defaults: TAB_PILL_GLASS,
      })
      shell.classList.add('liquid-glass-active')
      setEnabled(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          instanceRef.current?.markChanged()
        })
      })
    } catch (err) {
      console.warn('LiquidGlass init failed, using CSS fallback', err)
      shell.classList.remove('liquid-glass-active')
      setEnabled(false)
    }
  }, [shellRef])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    void refresh()

    const onScroll = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (!target.classList.contains('screen-scroll')) return
      instanceRef.current?.markChanged(target)
    }

    const onResize = () => {
      instanceRef.current?.markChanged()
    }

    const transparencyQuery = window.matchMedia('(prefers-reduced-transparency: reduce)')
    const onTransparencyChange = () => {
      void refresh()
    }

    shell.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    transparencyQuery.addEventListener('change', onTransparencyChange)

    return () => {
      shell.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
      transparencyQuery.removeEventListener('change', onTransparencyChange)
      shell.classList.remove('liquid-glass-active')
      instanceRef.current?.destroy()
      instanceRef.current = null
      setEnabled(false)
    }
  }, [refresh, shellRef])

  return (
    <LiquidGlassContext.Provider value={{ refresh, enabled }}>
      {children}
    </LiquidGlassContext.Provider>
  )
}
