import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CodeCharBoxesReadonly } from '../components/CodeCharBoxes'
import { Layout } from '../components/Layout'
import type { BeerGift } from '../types/beerGift'
import { BeerGiftServiceError, beerGiftService } from '../services/beerGiftService'
import {
  formatExpiresAtForDisplay,
  formatLocalNowForDisplay,
  formatUpdatedClock,
  hoursUntilExpiresAt,
} from '../utils/dates'
import { attachPullToRefresh } from '../utils/pullToRefreshHint'
import { copyToClipboard } from '../utils/copyToClipboard'
import { getStoredClaimerName, setStoredClaimerName } from '../utils/claimerNameStorage'

/** Show "Expiring soon" only when the code stops within this many hours. */
const SOON_HOURS = 24

function ClaimConfirmModal({
  gift,
  submitting,
  error,
  onCancel,
  onConfirm,
}: {
  gift: BeerGift
  submitting: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (claimedBy: string) => void | Promise<void>
}) {
  const [name, setName] = useState(getStoredClaimerName)
  const [nowLabel, setNowLabel] = useState(() => formatLocalNowForDisplay())

  useEffect(() => {
    const id = window.setInterval(() => setNowLabel(formatLocalNowForDisplay()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, submitting])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const t = name.trim()
    if (!t || submitting) return
    await onConfirm(t)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={submitting ? undefined : onCancel}>
      <div
        className="modal modal-claim-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="claim-confirm-title">Take this beer?</h2>
        <p className="modal-claim-now" role="status">
          <strong>Now (your device):</strong> {nowLabel}
        </p>
        <p>
          From <strong>{gift.giftedBy}</strong>. Use in Fanzo before {formatExpiresAtForDisplay(gift.expiresAt)}.
        </p>
        {error ? (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '0.85rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        ) : null}
        <form onSubmit={(e) => void submit(e)}>
          <div className="modal-form-field">
            <label htmlFor="claim-your-name">Your name</label>
            <input
              id="claim-your-name"
              name="claimedBy"
              type="text"
              autoComplete="name"
              placeholder="So the group knows who grabbed it"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              disabled={submitting}
            />
          </div>
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !name.trim()}>
              {submitting ? 'Taking...' : 'Take this beer'}
            </button>
            <button type="button" className="btn btn-secondary btn-block" disabled={submitting} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ClaimModal({
  gift,
  onClose,
}: {
  gift: BeerGift
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = useCallback(async () => {
    setCopyError(false)
    const ok = await copyToClipboard(gift.code)
    setCopied(ok)
    setCopyError(!ok)
  }, [gift.code])

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="claim-title">Your beer code is ready</h2>
        {gift.claimedAt && gift.claimedBy ? (
          <p className="modal-claim-meta" role="status">
            <strong>{gift.claimedBy}</strong> took this at {formatExpiresAtForDisplay(gift.claimedAt)}.
          </p>
        ) : null}
        <p>Use it in Fanzo before {formatExpiresAtForDisplay(gift.expiresAt)}.</p>
        <p className="modal-claim-reassure">
          Nobody else sees this listing anymore—it is off the shared board straight away.
        </p>
        <div className="code-display">
          <CodeCharBoxesReadonly code={gift.code} size="lg" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
          {copyError ? (
            <p className="form-hint" style={{ color: 'var(--color-danger)', textAlign: 'center', margin: 0 }}>
              Copy failed; select the code above or type it in from Fanzo.
            </p>
          ) : null}
          <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
            Cheers
          </button>
        </div>
      </div>
    </div>
  )
}

export function GrabPage() {
  const [items, setItems] = useState<BeerGift[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastListUpdated, setLastListUpdated] = useState<Date | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [pendingClaim, setPendingClaim] = useState<BeerGift | null>(null)
  const [claimed, setClaimed] = useState<BeerGift | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)

  const fetchList = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (!silent) {
      setLoadError(null)
      setLoading(true)
    }
    try {
      const rows = await beerGiftService.listAvailable()
      setItems(rows)
      setLastListUpdated(new Date())
      if (!silent) setLoadError(null)
    } catch {
      if (!silent) setLoadError('Could not load the list. Check your connection and try again.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      void fetchList()
    })
    return () => window.cancelAnimationFrame(id)
  }, [fetchList])

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchList({ silent: true })
    }, 45_000)
    return () => window.clearInterval(id)
  }, [fetchList])

  useEffect(() => {
    return attachPullToRefresh(() => void fetchList({ silent: true }))
  }, [fetchList])

  function cancelPendingClaim() {
    if (claimingId !== null) return
    setClaimError(null)
    setPendingClaim(null)
  }

  async function onConfirmClaim(claimedBy: string) {
    if (!pendingClaim) return
    setClaimError(null)
    setClaimingId(pendingClaim.id)
    try {
      const row = await beerGiftService.claim(pendingClaim.id, claimedBy)
      setStoredClaimerName(claimedBy)
      setPendingClaim(null)
      setClaimed(row)
      await fetchList({ silent: true })
    } catch (err) {
      if (err instanceof BeerGiftServiceError) {
        setClaimError(err.message)
      } else {
        setClaimError('Could not claim that one. Refresh and try again.')
      }
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <Layout showBack>
      <h2 className="page-title" style={{ color: 'var(--color-surface)' }}>
        Grab a Beer
      </h2>
      <p style={{ margin: '0 0 1rem', color: 'rgba(245,230,200,0.9)' }}>
        Soonest expiry is first. You will be asked for your name and the time is shown before you take a code. Beers
        drop off this list when the expiry time passes.
      </p>
      {claimError && !pendingClaim ? (
        <div className="alert alert-error" role="alert" style={{ background: '#fde8ef', color: '#5c0a24' }}>
          {claimError}
        </div>
      ) : null}
      {loading ? <div className="loading-line">Loading...</div> : null}
      {!loading && loadError ? (
        <section className="grab-panel-error" aria-live="polite">
          <h3 className="grab-panel-error-title">List did not load</h3>
          <p className="grab-panel-error-text">{loadError}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void fetchList()}>
            Try again
          </button>
        </section>
      ) : null}
      {!loading && !loadError && items.length === 0 ? (
        <section className="surface-panel empty-board" aria-labelledby="empty-board-title">
          <p className="empty-board-badge" aria-hidden>
            All caught up
          </p>
          <h3 id="empty-board-title" className="empty-board-title">
            No beers on the board right now
          </h3>
          <p className="empty-board-text">
            When someone gifts a spare Fanzo code, it lands here sorted by expiry. Pull down from the top of the screen
            to refresh—or wait a minute and we will retry for you.
          </p>
          <div style={{ marginTop: '1.1rem' }}>
            <Link to="/gift" className="btn btn-primary btn-block">
              Gift a Beer
            </Link>
          </div>
        </section>
      ) : null}
      {!loading && !loadError && items.length > 0 ? (
        <>
          <div className="grab-list-toolbar">
            <p className="grab-list-meta" role="status">
              {lastListUpdated ? (
                <>
                  Updated <strong>{formatUpdatedClock(lastListUpdated)}</strong>
                </>
              ) : (
                <>Loading times…</>
              )}
              <span className="grab-list-meta-hint" aria-hidden>
                {' '}
                · pull down from top or tap refresh to reload
              </span>
            </p>
            <button type="button" className="btn btn-ghost-refresh" onClick={() => void fetchList({ silent: true })}>
              Refresh list
            </button>
          </div>
          <div className="beer-list">
          {items.map((g) => {
            const hoursLeft = hoursUntilExpiresAt(g.expiresAt)
            const soon = hoursLeft > 0 && hoursLeft <= SOON_HOURS
            return (
              <article key={g.id} className={`beer-card${soon ? ' beer-card--soon' : ''}`}>
                <div className="beer-card-head">
                  <CodeCharBoxesReadonly code={g.code} />
                  {soon ? <span className="badge-soon">Expiring soon</span> : null}
                </div>
                <p className="expiry-line">Expires {formatExpiresAtForDisplay(g.expiresAt)}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem' }}>
                  From <strong>{g.giftedBy}</strong>
                </p>
                {g.note ? <p className="note-line">"{g.note}"</p> : null}
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  style={{ marginTop: '0.85rem' }}
                  disabled={claimingId !== null || pendingClaim !== null}
                  onClick={() => {
                    setClaimError(null)
                    setPendingClaim(g)
                  }}
                >
                  Claim beer
                </button>
              </article>
            )
          })}
        </div>
        </>
      ) : null}
      {pendingClaim ? (
        <ClaimConfirmModal
          key={pendingClaim.id}
          gift={pendingClaim}
          submitting={claimingId === pendingClaim.id}
          error={claimError}
          onCancel={cancelPendingClaim}
          onConfirm={(name) => void onConfirmClaim(name)}
        />
      ) : null}
      {claimed ? <ClaimModal gift={claimed} onClose={() => setClaimed(null)} /> : null}
    </Layout>
  )
}
