/** End of local calendar day for a `YYYY-MM-DD` string (legacy rows). */
export function endOfLocalDay(ymd: string): Date {
  const parts = ymd.split('-').map(Number)
  const y = parts[0]
  const m = parts[1]
  const d = parts[2]
  if (y === undefined || m === undefined || d === undefined) {
    return new Date(NaN)
  }
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

/** `true` when this instant is in the past or exactly now (no longer listed). */
export function expiresAtHasPassed(iso: string): boolean {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return true
  return t <= Date.now()
}

/** Whole days from local midnight today until the expiry instant; negative if already passed. */
export function daysUntilExpiresAt(iso: string): number {
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return -1
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const ms = end.getTime() - startToday.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

/** Hours from now until expiry; negative if passed. */
export function hoursUntilExpiresAt(iso: string): number {
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) return -1
  return (end - Date.now()) / (1000 * 60 * 60)
}

export function formatExpiresAtForDisplay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Build UTC ISO from local date (`YYYY-MM-DD`) and time (`HH:mm` or `HH:mm:ss`). */
export function localDateAndTimeToExpiresAtIso(dateYmd: string, timeRaw: string): string {
  const time = timeRaw.trim()
  const timeWithSeconds = time.length === 5 ? `${time}:00` : time
  const d = new Date(`${dateYmd}T${timeWithSeconds}`)
  if (Number.isNaN(d.getTime())) {
    throw new RangeError('Invalid date or time')
  }
  return d.toISOString()
}
