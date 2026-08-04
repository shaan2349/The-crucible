import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './screens/Landing'
import { AppShell } from './components/AppShell'
import { Debate } from './screens/Debate'
import { Library } from './screens/Library'
import { Train } from './screens/Train'
import { History } from './screens/History'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="debate" replace />} />
          <Route path="debate" element={<Debate />} />
          <Route path="library" element={<Library />} />
          <Route path="train" element={<Train />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
