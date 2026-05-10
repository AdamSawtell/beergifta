import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { GiftPage } from './pages/GiftPage'
import { GrabPage } from './pages/GrabPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  if (import.meta.env.PROD && !isSupabaseConfigured()) {
    return (
      <div className="app-shell app-config-error">
        <h1 className="app-config-error-title">Shared database not configured</h1>
        <p>
          Beer Gifta needs Supabase for one list everyone can see. In AWS Amplify, open this app, then{' '}
          <strong>Environment variables</strong>, and add:
        </p>
        <ul className="app-config-error-list">
          <li>
            <code>VITE_SUPABASE_URL</code> (from Supabase project settings)
          </li>
          <li>
            <code>VITE_SUPABASE_ANON_KEY</code> (anon public key, not the service role)
          </li>
        </ul>
        <p>Save, then trigger a new deployment so the build picks up the values. The README in the repo has the SQL to run in Supabase first.</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gift" element={<GiftPage />} />
        <Route path="/grab" element={<GrabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
