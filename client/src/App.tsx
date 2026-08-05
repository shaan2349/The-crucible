import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './screens/Landing'
import { AppShell } from './components/AppShell'
import { Debate } from './screens/Debate'
import { Library } from './screens/Library'
import { Train } from './screens/Train'
import { History } from './screens/History'
import { DuotoneDefs } from './components/DuotoneDefs'

function App() {
  return (
    <BrowserRouter>
      <DuotoneDefs />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="reflect" replace />} />
          <Route path="reflect" element={<Debate />} />
          <Route path="archive" element={<Library />} />
          <Route path="train" element={<Train />} />
          <Route path="journal" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
