import { Routes, Route } from 'react-router-dom'

import ScanPage from './pages/ScanPage'
import AdminLogin from './pages/AdminLogin'
import EmployeeLogin from './pages/EmployeeLogin'

import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import AdminLeave from './pages/AdminLeave'
import Announcements from './pages/Announcements'
import Reports from './pages/Reports'
import Activity from './pages/Activity'
import Settings from './pages/Settings'
import AdminTask from './pages/AdminTask'

import EmployeeDashboard from './pages/EmployeeDashboard'
import EmployeeLeave from './pages/EmployeeLeave'
import EmployeeProfile from './pages/EmployeeProfile'
import EmployeeAttendance from './pages/EmployeeAttendance'
import EmployeeTask from './pages/EmployeeTask'

import TeamScan from './pages/TeamScan'
import ScannerTerminal from './pages/ScannerTerminal'

import AdminLayout from './layouts/AdminLayout'
import EmployeeLayout from './layouts/EmployeeLayout'

import ScrollToTop from './components/ScrollToTop'
import RequireAuth from './RequireAuth.jsx'

function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/" element={<ScanPage />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/employee/login" element={<EmployeeLogin />} />
        <Route path="/scan" element={<ScannerTerminal />} />

        {/* 🔐 ADMIN ROUTES (PROTECTED) */}
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<AdminLeave />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="reports" element={<Reports />} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="tasks" element={<AdminTask />} />
        </Route>

        {/* 🔐 EMPLOYEE ROUTES (PROTECTED) */}
        <Route
          path="/employee"
          element={
            <RequireAuth role="employee">
              <EmployeeLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="leave" element={<EmployeeLeave />} />
          <Route path="profile" element={<EmployeeProfile />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="scan" element={<TeamScan />} />
          <Route path="settings" element={<Settings />} />
          <Route path="tasks" element={<EmployeeTask />} />
        </Route>

      </Routes>
    </>
  )
}

export default App