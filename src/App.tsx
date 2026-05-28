import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import './styles/App.css'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Home />
      </Layout>
    </AuthProvider>
  )
}

export default App
