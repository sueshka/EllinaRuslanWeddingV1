import { useEffect, useRef, useState } from 'react'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export interface Edges {
  atTop: boolean
  atBottom: boolean
}

/** Is the scrollable scene scrolled to its top / bottom edge? No scroller — both. */
const edgesOf = (el: HTMLElement | null | undefined): Edges =>
  el ? { atTop: el.scrollTop <= 0, atBottom: el.scrollTop + el.clientHeight >= el.scrollHeight - 2 } : { atTop: true, atBottom: true }

/**
 * Swipe and mouse wheel / trackpad → step(dir, edges).
 * dir > 0 — forward, < 0 — back; edges — where the current scene's scroller was when the gesture began.
 * A wheel gesture moves one scene (it ends after a 250ms pause).
 *
 * The browser scrolls before the wheel handler runs, so for the wheel the edges are taken from where
 * the page last came to rest — one big wheel turn scrolls to the bottom, the next one moves on.
 */
export function useSceneGestures(step: (dir: 1 | -1, edges: Edges) => void, getScroller?: () => HTMLElement | null) {
  const touch = useRef<{ y: number; edges: Edges } | null>(null)
  const wheel = useRef({ last: 0, used: false, edges: { atTop: true, atBottom: true }, lockUntil: 0 })
  const rest = useRef<{ el: HTMLElement | null; edges: Edges; timer: number }>({ el: null, edges: edgesOf(null), timer: 0 })

  // a new scene (scroller) starts from its current position
  useEffect(() => {
    const el = getScroller?.() ?? null
    if (rest.current.el !== el) rest.current = { ...rest.current, el, edges: edgesOf(el) }
  })

  return {
    onScrollCapture: () => {
      const r = rest.current
      clearTimeout(r.timer)
      r.timer = window.setTimeout(() => {
        r.el = getScroller?.() ?? null
        r.edges = edgesOf(r.el)
      }, 200)
    },
    onTouchStart: (e: React.TouchEvent) => (touch.current = { y: e.touches[0].clientY, edges: edgesOf(getScroller?.()) }),
    onTouchEnd: (e: React.TouchEvent) => {
      const start = touch.current
      touch.current = null
      if (!start) return
      const dy = e.changedTouches[0].clientY - start.y
      if (Math.abs(dy) >= 50) step(dy < 0 ? 1 : -1, start.edges)
    },
    onWheel: (e: React.WheelEvent) => {
      const w = wheel.current
      const now = performance.now()
      if (now - w.last > 250) {
        w.used = false
        w.edges = rest.current.edges
      }
      w.last = now
      if (w.used || now < w.lockUntil || Math.abs(e.deltaY) < 6) return
      w.used = true
      w.lockUntil = now + 900
      step(e.deltaY > 0 ? 1 : -1, w.edges)
    },
  }
}

/** Keyboard shortcuts must not fire while the guest is typing in the form. */
export const isTyping = (e: KeyboardEvent) => !!(e.target as HTMLElement | null)?.closest?.('input, textarea, select')
