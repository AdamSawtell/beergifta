import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { beerGiftService } from '../services/beerGiftService'
import { getShareSiteUrl } from '../utils/siteUrl'

const POLL_MS = 45_000

export function HomePage() {
  const siteUrl = getShareSiteUrl()
  const [availableCount, setAvailableCount] = useState<number | null>(null)
  const [claimedCount, setClaimedCount] = useState<number | null>(null)
  const [countErr, setCountErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadCount(isInitial: boolean) {
      try {
        const [available, claimed] = await Promise.all([
          beerGiftService.countAvailable(),
          beerGiftService.countClaimed(),
        ])
        if (cancelled) return
        setAvailableCount(available)
        setClaimedCount(claimed)
        setCountErr(null)
      } catch {
        if (cancelled) return
        if (isInitial) {
          setCountErr('Could not load how many beers are on the board.')
        }
      }
    }
    void loadCount(true)
    const id = window.setInterval(() => void loadCount(false), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return (
    <Layout>
      <section className="hero-card">
        <h1>Beer Gifta</h1>
        <p>Share spare Beer to Gift codes with the Old Noarlunga footy tipping crew.</p>
        <div className="home-stats-banner" role="status" aria-live="polite">
          {countErr ? (
            <p className="home-stats-line">
              <span className="home-available-muted">{countErr}</span>
            </p>
          ) : availableCount === null || claimedCount === null ? (
            <p className="home-stats-line">
              <span className="home-available-muted">Checking the board…</span>
            </p>
          ) : (
            <>
              <p className="home-stats-line">
                {availableCount === 0 ? (
                  <>
                    <strong className="home-available-num">0</strong> beers available right now.{' '}
                    <Link to="/gift" className="home-available-link">
                      Gift one?
                    </Link>
                  </>
                ) : (
                  <>
                    <strong className="home-available-num">{availableCount}</strong>{' '}
                    {availableCount === 1 ? 'beer' : 'beers'} available ·{' '}
                    <Link to="/grab" className="home-available-link">
                      Grab one
                    </Link>
                  </>
                )}
              </p>
              <p className="home-stats-line home-stats-line--secondary">
                <strong className="home-available-num">{claimedCount}</strong>{' '}
                {claimedCount === 1 ? 'beer' : 'beers'} claimed so far (all time).
              </p>
            </>
          )}
        </div>
        <div className="actions-stack">
          <Link className="btn btn-primary btn-block" to="/gift">
            Gift a Beer
          </Link>
          <Link className="btn btn-secondary btn-block" to="/grab">
            Grab a Beer
          </Link>
        </div>
        <p className="note-small">
          Codes are 4 characters from Fanzo. Add date and hour for expiry (on the hour, PM by default); soonest expiry shows first when you grab.
        </p>
      </section>

      <section className="share-qr-card" aria-labelledby="share-qr-heading">
        <h2 id="share-qr-heading" className="share-qr-heading">
          Share the site with other legends
        </h2>
        <p className="share-qr-lead">Scan the code so mates can open Beer Gifta on their phone.</p>
        <div className="share-qr-stack">
          <div className="share-qr-frame">
            <QRCodeSVG
              value={siteUrl}
              size={176}
              level="M"
              includeMargin
              title="Open Beer Gifta"
              bgColor="#fffef8"
              fgColor="#3a060f"
            />
          </div>
          <a className="share-qr-link" href={siteUrl}>
            {siteUrl}
          </a>
        </div>
      </section>
    </Layout>
  )
}
