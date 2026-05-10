import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout'

export function HomePage() {
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
          Codes are 4 characters from Fanzo. Add date and time for expiry; soonest expiry shows first when you grab.
        </p>
      </section>
    </Layout>
  )
}
