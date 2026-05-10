import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { CodeCharBoxesEdit } from '../components/CodeCharBoxes'
import { Layout } from '../components/Layout'
import { BeerGiftServiceError, beerGiftService } from '../services/beerGiftService'

export function GiftPage() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryTime, setExpiryTime] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await beerGiftService.add({
        giftedBy: name,
        code,
        expiryDate,
        expiryTime,
        note: note.trim() ? note.trim() : null,
      })
      setSuccess(true)
      setCode('')
      setExpiryDate('')
      setExpiryTime('')
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
              Use the same <strong>date</strong> and <strong>time</strong> Fanzo shows. Both are required.
            </p>
            <div className="form-row-datetime">
              <div>
                <label htmlFor="gift-expiry-date">Expiry date</label>
                <input
                  id="gift-expiry-date"
                  name="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="gift-expiry-time">Expiry time</label>
                <input
                  id="gift-expiry-time"
                  name="expiryTime"
                  type="time"
                  step={60}
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  required
                />
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
