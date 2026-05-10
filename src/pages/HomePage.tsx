import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { getShareSiteUrl } from '../utils/siteUrl'

export function HomePage() {
  const siteUrl = getShareSiteUrl()

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
