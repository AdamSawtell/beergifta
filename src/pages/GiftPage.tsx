import { FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CodeCharBoxesEdit } from '../components/CodeCharBoxes'
import { Layout } from '../components/Layout'
import { BeerGiftServiceError, beerGiftService } from '../services/beerGiftService'
import { daysInMonth, hour12MeridiemTo24HourClock, type Meridiem, ymdFromParts } from '../utils/dates'

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

const MONTH_OPTIONS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
] as const

function calendarToday(): { y: number; m: number; d: number } {
  const n = new Date()
  return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }
}

function yearOptions(): number[] {
  const start = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => start + i)
}

export function GiftPage() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [expiryYear, setExpiryYear] = useState(() => calendarToday().y)
  const [expiryMonth, setExpiryMonth] = useState(() => calendarToday().m)
  const [expiryDay, setExpiryDay] = useState(() => calendarToday().d)
  const [expiryHour12, setExpiryHour12] = useState<number>(6)
  const [expiryMeridiem, setExpiryMeridiem] = useState<Meridiem>('PM')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const expiryDate = useMemo(
    () => ymdFromParts(expiryYear, expiryMonth, expiryDay),
    [expiryYear, expiryMonth, expiryDay],
  )
  const maxDayInMonth = daysInMonth(expiryYear, expiryMonth)
  const dayOptions = useMemo(
    () => Array.from({ length: maxDayInMonth }, (_, i) => i + 1),
    [maxDayInMonth],
  )

  function onExpiryMonthChange(m: number) {
    setExpiryMonth(m)
    setExpiryDay((d) => Math.min(d, daysInMonth(expiryYear, m)))
  }

  function onExpiryYearChange(y: number) {
    setExpiryYear(y)
    setExpiryDay((d) => Math.min(d, daysInMonth(y, expiryMonth)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      const expiryTime = hour12MeridiemTo24HourClock(expiryHour12, expiryMeridiem)
      await beerGiftService.add({
        giftedBy: name,
        code,
        expiryDate,
        expiryTime,
        note: note.trim() ? note.trim() : null,
      })
      setSuccess(true)
      setCode('')
      const t = calendarToday()
      setExpiryYear(t.y)
      setExpiryMonth(t.m)
      setExpiryDay(t.d)
      setExpiryHour12(6)
      setExpiryMeridiem('PM')
      setNote('')
    } catch (err) {
      if (err instanceof BeerGiftServiceError) {
        setError(err.message)
      } else {
        setError('Something went wrong. Try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout showBack>
      <h2 className="page-title" style={{ color: 'var(--color-surface)' }}>
        Gift a Beer
      </h2>
      <section className="surface-panel">
        <p style={{ marginTop: 0, color: 'var(--color-text-muted)' }}>
          Add a spare code from Fanzo so someone in the group can use it before it expires.
        </p>
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="alert alert-success" role="status">
            Thanks, your beer is on the board. Tell the group to check Grab a Beer.
          </div>
        ) : null}
        <form onSubmit={onSubmit}>
          <div className="form-field">
            <label htmlFor="gift-name">Your name</label>
            <input
              id="gift-name"
              name="giftedBy"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
            />
          </div>
          <fieldset className="form-field form-fieldset-code">
            <legend>4-character code</legend>
            <CodeCharBoxesEdit value={code} onChange={setCode} disabled={submitting} />
            <p className="form-hint">One character per box, as shown in Fanzo. You can paste all four at once.</p>
          </fieldset>
          <fieldset className="form-field form-fieldset-expiry">
            <legend>When does this code stop working?</legend>
            <p className="form-hint" style={{ marginTop: 0, marginBottom: '0.65rem' }}>
              Use the same <strong>date</strong> and <strong>hour</strong> as Fanzo. Time is <strong>on the hour only</strong> (no minutes).{' '}
              <strong>PM</strong> is selected by default so it is quick to match evening cutoffs.
            </p>
            <div className="form-row-datetime">
              <div className="form-expiry-date-col">
                <span className="form-expiry-date-heading" id="gift-expiry-date-heading">
                  Expiry date
                </span>
                <div
                  className="form-expiry-date-grid"
                  role="group"
                  aria-labelledby="gift-expiry-date-heading"
                >
                  <div>
                    <label htmlFor="gift-expiry-day" className="form-sublabel">
                      Day
                    </label>
                    <select
                      id="gift-expiry-day"
                      name="expiryDay"
                      value={expiryDay}
                      onChange={(e) => setExpiryDay(Number(e.target.value))}
                      disabled={submitting}
                    >
                      {dayOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gift-expiry-month" className="form-sublabel">
                      Month
                    </label>
                    <select
                      id="gift-expiry-month"
                      name="expiryMonth"
                      value={expiryMonth}
                      onChange={(e) => onExpiryMonthChange(Number(e.target.value))}
                      disabled={submitting}
                    >
                      {MONTH_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gift-expiry-year" className="form-sublabel">
                      Year
                    </label>
                    <select
                      id="gift-expiry-year"
                      name="expiryYear"
                      value={expiryYear}
                      onChange={(e) => onExpiryYearChange(Number(e.target.value))}
                      disabled={submitting}
                    >
                      {yearOptions().map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-expiry-hour-col">
                <span className="form-expiry-hour-label" id="gift-expiry-time-label">
                  Expiry time (hour)
                </span>
                <div className="form-time-pair" role="group" aria-labelledby="gift-expiry-time-label">
                  <div>
                    <label htmlFor="gift-hour" className="form-sublabel">
                      Hour
                    </label>
                    <select
                      id="gift-hour"
                      name="expiryHour"
                      value={expiryHour12}
                      onChange={(e) => setExpiryHour12(Number(e.target.value))}
                      disabled={submitting}
                    >
                      {HOURS_12.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="gift-meridiem" className="form-sublabel">
                      AM / PM
                    </label>
                    <select
                      id="gift-meridiem"
                      name="expiryMeridiem"
                      value={expiryMeridiem}
                      onChange={(e) => setExpiryMeridiem(e.target.value as Meridiem)}
                      disabled={submitting}
                    >
                      <option value="PM">PM</option>
                      <option value="AM">AM</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
          <div className="form-field">
            <label htmlFor="gift-note">Optional note</label>
            <textarea id="gift-note" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Saving...' : 'Add to the board'}
          </button>
        </form>
        <p style={{ margin: '1rem 0 0', textAlign: 'center' }}>
          <Link to="/grab" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
            See available beers
          </Link>
        </p>
      </section>
    </Layout>
  )
}
