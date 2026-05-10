/** Touch pull distance from top of document to trigger a refresh callback. */
const PULL_THRESH_PX = 72

/** Optional pull-down-to-refresh when page is scrolled to top (mobile UX). */
export function attachPullToRefresh(onRefresh: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  let startY = 0
  let armed = false

  function reset() {
    armed = false
    startY = 0
  }

  function onTouchStart(ev: TouchEvent) {
    if (window.scrollY > 16) return
    const y = ev.touches[0]?.clientY
    if (y === undefined) return
    startY = y
    armed = true
  }

  function onTouchEnd(ev: TouchEvent) {
    if (!armed) return
    const t = ev.changedTouches[0]
    if (!t) {
      reset()
      return
    }
    const delta = t.clientY - startY
    if (window.scrollY <= 16 && delta > PULL_THRESH_PX) {
      onRefresh()
    }
    reset()
  }

  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', reset, { passive: true })

  return () => {
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('touchcancel', reset)
  }
}
