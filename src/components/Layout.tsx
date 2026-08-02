import { Link } from 'react-router-dom'

type LayoutProps = {
  showBack?: boolean
  children: React.ReactNode
}

export function Layout({ showBack, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand-link">
          <div className="brand-title-row">
            <img
              className="pies-logo"
              src="/images/pies-logo.png"
              alt=""
              width={44}
              height={44}
              decoding="async"
            />
            <div className="brand-title-text">
              <div className="brand-title-line">
                <h1 className="brand-title">Beer Gifta</h1>
                <span className="pies-badge">Green & Gold</span>
              </div>
              <p className="brand-sub">Old Noarlunga Hotel · AFL tipping</p>
            </div>
          </div>
        </Link>
        {showBack ? (
          <Link to="/" className="nav-back">
            ← Home
          </Link>
        ) : null}
      </header>
      <main className="app-main">{children}</main>
      <footer className="footer">
        <p className="footer-disclaimer note-small">
          Beer to Gift codes are issued by third-party apps such as <strong>Fanzo</strong>. Beer Gifta is independent and not
          affiliated with Fanzo. Use codes only as their terms allow.
        </p>
        <p className="note-small" style={{ margin: '0 0 0.5rem' }}>
          Please enjoy responsibly. For adults 18+ only.
        </p>
        <p style={{ margin: 0 }}>
          Developed by <strong>SAWTELL</strong>
        </p>
      </footer>
    </div>
  )
}
