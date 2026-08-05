import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './screens/Landing'
import { AppShell } from './components/AppShell'
import { Reflect } from './screens/Reflect'
import { Council } from './screens/Council'
import { Library } from './screens/Library'
import { Train } from './screens/Train'
import { History } from './screens/History'
import { Profile } from './screens/Profile'
import { Settings } from './screens/Settings'
import { DuotoneDefs } from './components/DuotoneDefs'
import { DebateProvider } from './context/DebateContext'
import { PreferencesProvider } from './context/PreferencesContext'

function App() {
  return (
    <BrowserRouter>
      <DuotoneDefs />
      <PreferencesProvider>
        <DebateProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppShell />}>
              <Route index element={<Navigate to="reflect" replace />} />
              <Route path="reflect" element={<Reflect />} />
              <Route path="council" element={<Council />} />
              <Route path="archive" element={<Library />} />
              <Route path="train" element={<Train />} />
              <Route path="journal" element={<History />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </DebateProvider>
      </PreferencesProvider>
    </BrowserRouter>
  )
}

export default App
