/** Days in a calendar month (1–12), local Gregorian rules (leap years included). */
export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return 31
  }
  return new Date(year, month, 0).getDate()
}

/** Local calendar parts → `YYYY-MM-DD` for storage and APIs. */
export function ymdFromParts(year: number, month: number, day: number): string {
  const max = daysInMonth(year, month)
  const safeDay = Math.min(Math.max(1, Math.floor(day)), max)
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}

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

export type Meridiem = 'AM' | 'PM'

/** 12-hour clock (1–12) + AM/PM → `HH:00:00` for `localDateAndTimeToExpiresAtIso`. */
export function hour12MeridiemTo24HourClock(hour12: number, meridiem: Meridiem): string {
  if (!Number.isInteger(hour12) || hour12 < 1 || hour12 > 12) {
    throw new RangeError('Hour must be a whole number from 1 to 12')
  }
  const h24 =
    meridiem === 'AM' ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12
  return `${String(h24).padStart(2, '0')}:00:00`
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
