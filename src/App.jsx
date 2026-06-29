import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout.jsx'
import { MemberList } from './pages/MemberList.jsx'
import { MemberDetail } from './pages/MemberDetail.jsx'
import { MemberForm } from './pages/MemberForm.jsx'
import { PlanList } from './pages/master/PlanList.jsx'
import { EntitlementAppList } from './pages/master/EntitlementAppList.jsx'
import { TestMapping } from './pages/master/TestMapping.jsx'

function App() {
  return (
    <Layout>
      <Routes>
        {/* 会員管理 */}
        <Route path="/" element={<MemberList />} />
        <Route path="/members/new" element={<MemberForm mode="new" />} />
        <Route path="/members/:id" element={<MemberDetail />} />
        <Route path="/members/:id/edit" element={<MemberForm mode="edit" />} />

        {/* マスタ管理（T4） */}
        <Route path="/master/plans" element={<PlanList />} />
        <Route path="/master/entitlements" element={<EntitlementAppList />} />
        <Route path="/master/test-mapping" element={<TestMapping />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
