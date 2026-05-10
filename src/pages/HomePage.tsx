import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { beerGiftService, type BoardStats, type TopGifter } from '../services/beerGiftService'
import { getShareSiteUrl } from '../utils/siteUrl'

const POLL_MS = 45_000

export function HomePage() {
  const siteUrl = getShareSiteUrl()
  const [stats, setStats] = useState<BoardStats | null>(null)
  const [topGifters, setTopGifters] = useState<TopGifter[]>([])
  const [countErr, setCountErr] = useState<string | null>(null)

  const loadBoard = useCallback(async (isInitial: boolean) => {
    try {
      const s = await beerGiftService.boardStats()
      let leaders: TopGifter[] = []
      try {
        leaders = await beerGiftService.topGiftersThisMonth(5)
      } catch {
        leaders = []
      }
      setStats(s)
      setTopGifters(leaders)
      setCountErr(null)
    } catch {
      if (!isInitial) return
      setCountErr('Could not load how many beers are on the board.')
      setStats(null)
      setTopGifters([])
    }
  }, [])

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      void loadBoard(true)
    })
    const id = window.setInterval(() => {
      void loadBoard(false)
    }, POLL_MS)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearInterval(id)
    }
  }, [loadBoard])

  function retryStats() {
    setCountErr(null)
    setStats(null)
    void loadBoard(true)
  }

  const availableCount = stats?.available
  const claimedCount = stats?.claimed

  return (
    <Layout>
      <section className="hero-card">
        <h1>Beer Gifta</h1>
        <p>Share spare Beer to Gift codes with the Old Noarlunga footy tipping crew.</p>
        <div className="actions-stack">
          <Link className="btn btn-primary btn-block" to="/gift">
            Gift a Beer
          </Link>
          <Link className="btn btn-secondary btn-block" to="/grab">
            Grab a Beer
          </Link>
        </div>
        <div className="home-stats-banner" role="status" aria-live="polite">
          {countErr ? (
            <div className="home-stats-error-panel">
              <p className="home-stats-error-msg">{countErr}</p>
              <button type="button" className="btn btn-primary btn-block" onClick={retryStats}>
                Try again
              </button>
            </div>
          ) : availableCount === undefined || claimedCount === undefined ? (
            <p className="home-stats-feedback home-stats-feedback--muted">
              <span className="home-stats-pulse" aria-hidden />
              Checking the board…
            </p>
          ) : (
            <>
              <div className="home-stats-grid">
                <article
                  className="home-stat-card home-stat-card--live"
                  aria-label={`${availableCount} ${availableCount === 1 ? 'beer' : 'beers'} on the board right now`}
                >
                  <div className="home-stat-card-inner">
                    <div className="home-stat-kpi">
                      <span className="home-stat-value" aria-hidden="true">
                        {availableCount}
                      </span>
                    </div>
                    <div className="home-stat-body">
                      <span className="home-stat-eyebrow">Right now</span>
                      <p className="home-stat-caption">
                        {availableCount === 1 ? 'beer' : 'beers'} on the board
                      </p>
                      {availableCount === 0 ? (
                        <Link to="/gift" className="home-stat-cta home-stat-cta-pill">
                          Gift one →
                        </Link>
                      ) : (
                        <Link to="/grab" className="home-stat-cta home-stat-cta-pill">
                          Grab one →
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
                <article
                  className="home-stat-card home-stat-card--total"
                  aria-label={`${claimedCount} ${claimedCount === 1 ? 'beer' : 'beers'} claimed all time`}
                >
                  <div className="home-stat-card-inner">
                    <div className="home-stat-kpi">
                      <span className="home-stat-value" aria-hidden="true">
                        {claimedCount}
                      </span>
                    </div>
                    <div className="home-stat-body">
                      <span className="home-stat-eyebrow">All time</span>
                      <p className="home-stat-caption">{claimedCount === 1 ? 'beer' : 'beers'} claimed</p>
                      <p className="home-stat-foot">
                        Codes taken from this list—your group’s running tally.
                      </p>
                    </div>
                  </div>
                </article>
              </div>
              {topGifters.length > 0 ? (
                <div className="home-leaderboard" aria-labelledby="home-leaderboard-heading">
                  <p id="home-leaderboard-heading" className="home-leaderboard-title">
                    Top gifters · this month
                  </p>
                  <ol className="home-leaderboard-list">
                    {topGifters.map((row, idx) => (
                      <li key={`${row.giftedBy}-${idx}`} className="home-leaderboard-row">
                        <span className="home-leaderboard-name">{row.giftedBy}</span>
                        <span className="home-leaderboard-badge">
                          {row.giftCount} {row.giftCount === 1 ? 'gift' : 'gifts'}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </>
          )}
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
