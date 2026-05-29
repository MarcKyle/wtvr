import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ReaderHome from './pages/ReaderHome'
import AuthorHome from './pages/AuthorHome'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import { ProtectedRoute, RootRedirect } from './routes'
import { ROLES } from './constants/roles'
import { ROUTES } from './constants/routes'

// Top-level router. Login is the entry point of the app: the root path
// redirects unauthenticated visitors to /login and authenticated users to
// their role-specific home (reader, author, or admin).
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path={ROUTES.ROOT} element={<RootRedirect />} />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route
              path={ROUTES.READER_HOME}
              element={
                <ProtectedRoute allowedRoles={[ROLES.READER]}>
                  <ReaderHome />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.AUTHOR_HOME}
              element={
                <ProtectedRoute allowedRoles={[ROLES.AUTHOR]}>
                  <AuthorHome />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.ADMIN}
              element={
                <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.PROFILE}
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
