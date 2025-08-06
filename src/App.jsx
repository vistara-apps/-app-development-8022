import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Monitoring from './pages/Monitoring'
import Sentiment from './pages/Sentiment'
import Alerts from './pages/Alerts'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/sentiment" element={<Sentiment />} />
          <Route path="/alerts" element={<Alerts />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

export default App