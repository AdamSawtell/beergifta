import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CodeCharBoxesReadonly } from '../components/CodeCharBoxes'
import { Layout } from '../components/Layout'
import type { BeerGift } from '../types/beerGift'
import { BeerGiftServiceError, beerGiftService } from '../services/beerGiftService'
import { formatExpiresAtForDisplay, hoursUntilExpiresAt } from '../utils/dates'
import { copyToClipboard } from '../utils/copyToClipboard'

/** Show "Expiring soon" only when the code stops within this many hours. */
const SOON_HOURS = 24

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
        <p>Use it in Fanzo before {formatExpiresAtForDisplay(gift.expiresAt)}.</p>
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
  const [claimingId, setClaimingId] = useState<string | null>(null)
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
      if (!silent) setLoadError(null)
    } catch {
      if (!silent) setLoadError('Could not load the list. Check your connection and try again.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadError(null)
      setLoading(true)
      try {
        const rows = await beerGiftService.listAvailable()
        if (!cancelled) setItems(rows)
      } catch {
        if (!cancelled) setLoadError('Could not load the list. Check your connection and try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const rows = await beerGiftService.listAvailable()
          setItems(rows)
        } catch {
          /* ignore: silent poll */
        }
      })()
    }, 45_000)
    return () => window.clearInterval(id)
  }, [])

  async function onClaim(id: string) {
    setClaimError(null)
    setClaimingId(id)
    try {
      const row = await beerGiftService.claim(id)
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
        Soonest expiry is first. One tap claims the code for you. Beers drop off this list when the expiry time passes.
      </p>
      {claimError ? (
        <div className="alert alert-error" role="alert" style={{ background: '#fde8ef', color: '#5c0a24' }}>
          {claimError}
        </div>
      ) : null}
      {loading ? <div className="loading-line">Loading...</div> : null}
      {!loading && loadError ? (
        <div className="surface-panel">
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => void fetchList()}>
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !loadError && items.length === 0 ? (
        <section className="surface-panel empty-state">
          No beers available right now. Check back soon or gift one if you have a spare.
          <div style={{ marginTop: '1rem' }}>
            <Link to="/gift" className="btn btn-primary btn-block">
              Gift a Beer
            </Link>
          </div>
        </section>
      ) : null}
      {!loading && !loadError && items.length > 0 ? (
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
                  disabled={claimingId !== null}
                  onClick={() => void onClaim(g.id)}
                >
                  {claimingId === g.id ? 'Claiming...' : 'Claim beer'}
                </button>
              </article>
            )
          })}
        </div>
      ) : null}
      {claimed ? <ClaimModal gift={claimed} onClose={() => setClaimed(null)} /> : null}
    </Layout>
  )
}
