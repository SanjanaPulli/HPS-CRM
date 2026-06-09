import { Navigate } from 'react-router-dom'

export default function RequireLeader({ children }) {
  const admin = localStorage.getItem('adminAuth')

  const employeeData = localStorage.getItem('employeeAuth')
  const employee = employeeData ? JSON.parse(employeeData) : null

  if (admin) {
    return children
  }

  if (employee?.isAttendanceLeader) {
    return children
  }

  return <Navigate to="/" replace />
}