import { useCallback, useEffect, useMemo, useState } from 'react'
import { daysInMonth, localYmdToday, ymdFromParts } from '../utils/dates'

type ExpiryDateCalendarModalProps = {
  valueYmd: string
  onClose: () => void
  onSelect: (ymd: string) => void
}

/** Sunday-first headers to match `Date#getDay()`. */
function weekdayShortLabels(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 9, 1 + i).toLocaleDateString(undefined, { weekday: 'short' }),
  )
}

function parseYmdLocal(ymd: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return { y, m: mo, d }
}

function monthStartOffsetSunday(y: number, m: number): number {
  return new Date(y, m - 1, 1).getDay()
}

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta
  const ny = Math.floor(idx / 12)
  const nm = (idx % 12) + 1
  return { y: ny, m: nm }
}

function initialViewFromYmd(valueYmd: string): { y: number; m: number } {
  const p = parseYmdLocal(valueYmd)
  if (p) return { y: p.y, m: p.m }
  const t = parseYmdLocal(localYmdToday())
  if (t) return { y: t.y, m: t.m }
  const n = new Date()
  return { y: n.getFullYear(), m: n.getMonth() + 1 }
}

export function ExpiryDateCalendarModal({
  valueYmd,
  onClose,
  onSelect,
}: ExpiryDateCalendarModalProps) {
  const todayYmd = localYmdToday()
  const dowLabels = useMemo(() => weekdayShortLabels(), [])

  const [{ y: viewYear, m: viewMonth }, setView] = useState(() => initialViewFromYmd(valueYmd))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const prevMonth = useCallback(() => {
    setView((v) => shiftMonth(v.y, v.m, -1))
  }, [])

  const nextMonth = useCallback(() => {
    setView((v) => shiftMonth(v.y, v.m, 1))
  }, [])

  const dim = daysInMonth(viewYear, viewMonth)
  const lead = monthStartOffsetSunday(viewYear, viewMonth)

  const monthTitle = useMemo(
    () =>
      new Date(viewYear, viewMonth - 1, 15).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [viewYear, viewMonth],
  )

  const cellKeys = useMemo(() => {
    const keys: { key: string; day: number | null; ymd: string | null }[] = []
    for (let i = 0; i < lead; i++) {
      keys.push({ key: `p-${i}`, day: null, ymd: null })
    }
    for (let d = 1; d <= dim; d++) {
      const ymd = ymdFromParts(viewYear, viewMonth, d)
      keys.push({ key: `d-${d}`, day: d, ymd })
    }
    const tail = (7 - (keys.length % 7)) % 7
    for (let i = 0; i < tail; i++) {
      keys.push({ key: `t-${i}`, day: null, ymd: null })
    }
    return keys
  }, [viewYear, viewMonth, dim, lead])

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal expiry-cal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expiry-cal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="expiry-cal-title">Pick expiry date</h2>
        <p className="expiry-cal-sub">Match the date shown in Fanzo. Past dates cannot be selected.</p>
        <div className="expiry-cal-toolbar">
          <button type="button" className="btn btn-secondary expiry-cal-nav" onClick={prevMonth} aria-label="Previous month">
            ‹
          </button>
          <span className="expiry-cal-month" aria-live="polite">
            {monthTitle}
          </span>
          <button type="button" className="btn btn-secondary expiry-cal-nav" onClick={nextMonth} aria-label="Next month">
            ›
          </button>
        </div>
        <div className="expiry-cal-grid" role="grid" aria-label="Calendar">
          {dowLabels.map((label, i) => (
            <div key={`dow-${i}`} className="expiry-cal-dow" role="columnheader">
              {label}
            </div>
          ))}
          {cellKeys.map(({ key, day, ymd }) => {
            if (day === null || ymd === null) {
              return <div key={key} className="expiry-cal-cell expiry-cal-cell--empty" aria-hidden />
            }
            const disabled = ymd < todayYmd
            const selected = ymd === valueYmd
            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                disabled={disabled}
                className={`expiry-cal-day${selected ? ' expiry-cal-day--selected' : ''}${disabled ? ' expiry-cal-day--disabled' : ''}`}
                onClick={() => {
                  if (disabled) return
                  onSelect(ymd)
                }}
              >
                {day}
              </button>
            )
          })}
        </div>
        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
