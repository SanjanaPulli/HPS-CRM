import { Routes, Route } from 'react-router-dom'
import ScanPage from './pages/ScanPage'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Attendance from './pages/Attendance'
import AdminLeave from './pages/AdminLeave'
import EmployeeLeave from './pages/EmployeeLeave'
import EmployeeLayout from './layouts/EmployeeLayout'
import EmployeeDashboard from './pages/EmployeeDashboard'
import AdminLayout from './layouts/AdminLayout'
import EmployeeLogin from './pages/EmployeeLogin'
import EmployeeProfile from './pages/EmployeeProfile'
import EmployeeAttendance from './pages/EmployeeAttendance'
import TeamScan from './pages/TeamScan'
import ScannerTerminal from './pages/ScannerTerminal'
import Announcements from './pages/Announcements'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import ScrollToTop from './components/ScrollToTop'
import Activity from './pages/Activity'
import AdminTask from './pages/AdminTask'
import EmployeeTask from './pages/EmployeeTask'

function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<ScanPage />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/employee/login" element={<EmployeeLogin />} />

        <Route path="/admin" element={<AdminLayout />}>
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

        <Route path="/employee" element={<EmployeeLayout />}>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="leave" element={<EmployeeLeave />} />
          <Route path="profile" element={<EmployeeProfile />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="scan" element={<TeamScan />} />
          <Route path="settings" element={<Settings />} />
          <Route path="tasks" element={<EmployeeTask />} />
        </Route>

        <Route path="/scan" element={<ScannerTerminal />} />
      </Routes>
    </>
  )
}

export default App