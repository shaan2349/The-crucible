import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { liftVeil } from './night/veil'
import { Landing } from './screens/Landing'
const Onboarding = lazy(() => import('./screens/Onboarding').then((m) => ({ default: m.Onboarding })))
import { AppShell } from './components/AppShell'
const Debate = lazy(() => import('./screens/Debate').then((m) => ({ default: m.Debate })))
const Council = lazy(() => import('./screens/Council').then((m) => ({ default: m.Council })))
const Profile = lazy(() => import('./screens/Profile').then((m) => ({ default: m.Profile })))
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })))
import { Sanctuary } from './screens/Sanctuary'
const Symposium = lazy(() => import('./screens/Symposium').then((m) => ({ default: m.Symposium })))
const Landscape = lazy(() => import('./screens/Landscape').then((m) => ({ default: m.Landscape })))
const Hall = lazy(() => import('./screens/Hall').then((m) => ({ default: m.Hall })))
const Experiments = lazy(() => import('./screens/Experiments').then((m) => ({ default: m.Experiments })))
const Journey = lazy(() => import('./screens/Journey').then((m) => ({ default: m.Journey })))
import { DuotoneDefs } from './components/DuotoneDefs'
import { DebateProvider } from './context/DebateContext'
import { ReflectProvider } from './context/ReflectContext'
import { PreferencesProvider } from './context/PreferencesContext'

/** Places drawn in 3D lift the veil themselves once drawn; every other page lifts it straight away. */
const SELF_LIFTING = ['/app', '/app/symposium', '/app/hall', '/app/landscape']
function VeilOnRouteChange() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (SELF_LIFTING.includes(pathname.replace(/\/$/, '') || '/')) return
    const t = window.setTimeout(liftVeil, 250)
    return () => window.clearTimeout(t)
  }, [pathname])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <DuotoneDefs />
      <VeilOnRouteChange />
      <PreferencesProvider>
        <DebateProvider>
          <ReflectProvider>
            <Suspense fallback={<div className="fixed inset-0" style={{ background: '#0B0D11' }} />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/app" element={<AppShell />}>
                <Route index element={<Sanctuary />} />
                <Route path="symposium" element={<Symposium />} />
                {/* Reflect became the Symposium; old links still land there. */}
                <Route path="reflect" element={<Navigate to="/app/symposium" replace />} />
                <Route path="debate" element={<Debate />} />
                <Route path="council" element={<Council />} />
                <Route path="hall" element={<Hall />} />
                {/* The Library became the Hall of Minds. */}
                <Route path="archive" element={<Navigate to="/app/hall" replace />} />
                <Route path="experiments" element={<Experiments />} />
                <Route path="journey" element={<Journey />} />
                <Route path="journey/:id" element={<Journey />} />
                <Route path="experiments/:id" element={<Experiments />} />
                {/* The Oracle became the Thought Experiments. */}
                <Route path="oracle" element={<Navigate to="/app/experiments" replace />} />
                {/* Training became the Oracle. */}
                <Route path="train" element={<Navigate to="/app/experiments" replace />} />
                <Route path="landscape" element={<Landscape />} />
                {/* My Thinking became Your Landscape. */}
                <Route path="mythinking" element={<Navigate to="/app/landscape" replace />} />
                {/* Old bookmarks/back-forward history to the pre-restructure
                    Journal route still land somewhere real. */}
                <Route path="journal" element={<Navigate to="/app/landscape" replace />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
            </Suspense>
          </ReflectProvider>
        </DebateProvider>
      </PreferencesProvider>
    </BrowserRouter>
  )
}

export default App
