import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GiftPage } from './pages/GiftPage'
import { GrabPage } from './pages/GrabPage'
import { HomePage } from './pages/HomePage'

export default function App() {
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
