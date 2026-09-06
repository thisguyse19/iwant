import { useEffect, useRef, type ReactNode } from 'react'
import './ScreenChrome.css'

const REVEAL_RANGE = 72

export interface ScreenBackAction {
  label: string
  onClick: () => void
}

interface ScreenChromeProps {
  title: string
  subtitle?: ReactNode
  back?: ScreenBackAction
  trailing?: ReactNode
  toolbar?: ReactNode
  className?: string
  children: ReactNode
}

export function ScreenChrome({
  title,
  subtitle,
  back,
  trailing,
  toolbar,
  className = '',
  children,
}: ScreenChromeProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const chromeRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const scrollEl = scrollRef.current
    const chromeEl = chromeRef.current
    if (!scrollEl || !chromeEl) return

    // Scroll-driven CSS handles reveal when supported; JS only for fallback + pointer-events.
    const useScrollTimeline = CSS.supports('animation-timeline', 'scroll()')

    const applyReveal = () => {
      rafRef.current = null
      const reveal = Math.min(1, Math.max(0, scrollEl.scrollTop / REVEAL_RANGE))

      if (!useScrollTimeline) {
        scrollEl.style.setProperty('--nav-reveal', reveal.toFixed(4))
      }

      if (reveal > 0.55) {
        chromeEl.dataset.revealed = ''
      } else {
        delete chromeEl.dataset.revealed
      }

      const toolbarEl = toolbarRef.current
      if (toolbarEl) {
        const stickyTop = toolbarEl.getBoundingClientRect().top
        const anchorTop = chromeEl.getBoundingClientRect().bottom
        if (stickyTop <= anchorTop + 1) {
          toolbarEl.dataset.stuck = ''
        } else {
          delete toolbarEl.dataset.stuck
        }
      }
    }

    const onScroll = () => {
      if (rafRef.current != null) return
      rafRef.current = requestAnimationFrame(applyReveal)
    }

    applyReveal()
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scrollEl.removeEventListener('scroll', onScroll)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className={`screen-layout screen-enter ${className}`.trim()}>
      <div className="screen-scroll" ref={scrollRef}>
        <header className="screen-sticky-chrome" ref={chromeRef}>
          <div className="screen-sticky-blur" aria-hidden="true" />
          <div className="screen-sticky-edge" aria-hidden="true" />

          <div className="screen-sticky-row screen-sticky-row-compact">
            <div className="screen-sticky-side screen-sticky-side-start">
              {back ? (
                <button type="button" className="screen-nav-back" onClick={back.onClick}>
                  <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
                    <path
                      d="M10 2L2 10l8 8"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{back.label}</span>
                </button>
              ) : null}
            </div>

            <h1 className="screen-sticky-title screen-sticky-title-compact">{title}</h1>

            <div className="screen-sticky-side screen-sticky-trailing">{trailing}</div>
          </div>
        </header>

        <div className="screen-hero">
          {back && (
            <button type="button" className="screen-nav-back screen-nav-back-large" onClick={back.onClick}>
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2L2 10l8 8"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{back.label}</span>
            </button>
          )}
          <div className="screen-hero-head">
            <h1 className="screen-sticky-title screen-sticky-title-large">{title}</h1>
            {trailing && <div className="screen-sticky-trailing screen-sticky-trailing-large">{trailing}</div>}
          </div>
          {subtitle && <p className="screen-hero-subtitle">{subtitle}</p>}
        </div>

        {toolbar && (
          <div className="screen-toolbar-sticky" ref={toolbarRef}>
            <div className="screen-toolbar-blur" aria-hidden="true" />
            <div className="screen-toolbar-content">{toolbar}</div>
          </div>
        )}

        <div className="screen-body">{children}</div>
      </div>
    </div>
  )
}
