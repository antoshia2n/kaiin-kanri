import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { MemberList } from './pages/MemberList.jsx'
import { MemberDetail } from './pages/MemberDetail.jsx'
import { MemberForm } from './pages/MemberForm.jsx'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MemberList />} />
        <Route path="/members/new" element={<MemberForm mode="new" />} />
        <Route path="/members/:id" element={<MemberDetail />} />
        <Route path="/members/:id/edit" element={<MemberForm mode="edit" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
