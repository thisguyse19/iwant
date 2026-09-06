import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import './ScreenChrome.css'

const COLLAPSE_RANGE = 72

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
  const [collapse, setCollapse] = useState(0)

  const updateCollapse = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const next = Math.min(1, Math.max(0, el.scrollTop / COLLAPSE_RANGE))
    setCollapse((prev) => (Math.abs(prev - next) < 0.01 ? prev : next))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateCollapse()
    el.addEventListener('scroll', updateCollapse, { passive: true })
    return () => el.removeEventListener('scroll', updateCollapse)
  }, [updateCollapse])

  const chromeStyle = { '--nav-collapse': collapse } as CSSProperties
  const collapsed = collapse > 0.92
  const showCompactBack = back && collapse > 0.35
  const showLargeBack = back && collapse <= 0.35

  return (
    <div className={`screen-layout screen-enter ${className}`.trim()}>
      <div className="screen-scroll" ref={scrollRef}>
        <header
          className="screen-sticky-chrome"
          style={chromeStyle}
          data-scrolled={collapse > 0.04 ? '' : undefined}
          data-collapsed={collapsed ? '' : undefined}
        >
          <div className="screen-sticky-blur" aria-hidden="true" />
          <div className="screen-sticky-edge" aria-hidden="true" />

          <div className="screen-sticky-row screen-sticky-row-compact">
            {showCompactBack ? (
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
            ) : (
              <span className="screen-sticky-side" aria-hidden="true" />
            )}

            <h1 className="screen-sticky-title screen-sticky-title-compact">{title}</h1>

            <div className="screen-sticky-side screen-sticky-trailing">
              {trailing}
            </div>
          </div>

          <div className="screen-sticky-large">
            {showLargeBack && (
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
            <div className="screen-sticky-large-head">
              <h1 className="screen-sticky-title screen-sticky-title-large">{title}</h1>
              {trailing && (
                <div className="screen-sticky-trailing screen-sticky-trailing-large">{trailing}</div>
              )}
            </div>
            {subtitle && <p className="screen-sticky-subtitle">{subtitle}</p>}
          </div>

          {toolbar && <div className="screen-sticky-toolbar">{toolbar}</div>}
        </header>

        <div className="screen-body">{children}</div>
      </div>
    </div>
  )
}
