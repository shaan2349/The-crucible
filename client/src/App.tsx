import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './screens/Landing'
import { Onboarding } from './screens/Onboarding'
import { AppShell } from './components/AppShell'
import { Reflect } from './screens/Reflect'
import { Debate } from './screens/Debate'
import { Council } from './screens/Council'
import { Library } from './screens/Library'
import { Train } from './screens/Train'
import { MyThinking } from './screens/MyThinking'
import { Profile } from './screens/Profile'
import { Settings } from './screens/Settings'
import { DuotoneDefs } from './components/DuotoneDefs'
import { DebateProvider } from './context/DebateContext'
import { ReflectProvider } from './context/ReflectContext'
import { PreferencesProvider } from './context/PreferencesContext'

function App() {
  return (
    <BrowserRouter>
      <DuotoneDefs />
      <PreferencesProvider>
        <DebateProvider>
          <ReflectProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/app" element={<AppShell />}>
                <Route index element={<Navigate to="reflect" replace />} />
                <Route path="reflect" element={<Reflect />} />
                <Route path="debate" element={<Debate />} />
                <Route path="council" element={<Council />} />
                <Route path="archive" element={<Library />} />
                <Route path="train" element={<Train />} />
                <Route path="mythinking" element={<MyThinking />} />
                {/* Old bookmarks/back-forward history to the pre-restructure
                    Journal route still land somewhere real. */}
                <Route path="journal" element={<Navigate to="/app/mythinking" replace />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </ReflectProvider>
        </DebateProvider>
      </PreferencesProvider>
    </BrowserRouter>
  )
}

export default App
