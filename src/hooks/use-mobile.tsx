import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsMobile(false)
      return
    }

    const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    const mql = window.matchMedia(query)
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // Initialize
    onChange()

    // Cross-browser listener support
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    } else if (typeof (mql as any).addListener === 'function') {
      ;(mql as any).addListener(onChange)
      return () => (mql as any).removeListener(onChange)
    } else {
      // Fallback: window resize
      window.addEventListener('resize', onChange)
      return () => window.removeEventListener('resize', onChange)
    }
  }, [])

  return isMobile
}
