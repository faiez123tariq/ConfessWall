import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import { NetworkToasts } from '@/components/NetworkToasts'
import HostPage from '@/pages/HostPage'
import JoinPage from '@/pages/JoinPage'
import WallPage from '@/pages/WallPage'

export default function App() {
  return (
    <BrowserRouter>
      <NetworkToasts />
      <Toaster position="top-center" richColors closeButton />
      <Routes>
        <Route path="/" element={<Navigate to="/join" replace />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/wall" element={<WallPage />} />
        <Route path="/host" element={<HostPage />} />
      </Routes>
    </BrowserRouter>
  )
}
