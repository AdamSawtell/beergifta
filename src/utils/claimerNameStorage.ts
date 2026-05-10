const KEY = 'beer-gifta:claimer-name:v1'

export function getStoredClaimerName(): string {
  if (typeof window === 'undefined') return ''
  try {
    const v = window.localStorage.getItem(KEY)
    return typeof v === 'string' ? v.trim() : ''
  } catch {
    return ''
  }
}

export function setStoredClaimerName(name: string): void {
  if (typeof window === 'undefined') return
  try {
    const t = name.trim()
    if (t) window.localStorage.setItem(KEY, t)
  } catch {
    /* ignore quota / privacy mode */
  }
}
