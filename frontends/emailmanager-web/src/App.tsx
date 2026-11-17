import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.js'
import { RequireSession } from './components/RequireSession.js'
import { InboxScreen } from './screens/InboxScreen.js'
import { PlaceholderScreen } from './screens/PlaceholderScreen.js'
import { SignInScreen } from './screens/SignInScreen.js'

export const App = () => (
  <Routes>
    <Route path="/sign-in" element={<SignInScreen />} />
    <Route
      element={
        <RequireSession>
          <Layout />
        </RequireSession>
      }
    >
      <Route path="/inbox" element={<InboxScreen />} />
      <Route path="/to-archive" element={<PlaceholderScreen title="To Archive" />} />
      <Route path="/to-respond" element={<PlaceholderScreen title="To Respond" />} />
      <Route path="/to-read" element={<PlaceholderScreen title="To Read" />} />
      <Route path="/settings" element={<PlaceholderScreen title="Settings" />} />
      <Route path="/activity" element={<PlaceholderScreen title="Activity log" />} />
    </Route>
    <Route path="*" element={<Navigate to="/inbox" replace />} />
  </Routes>
)
