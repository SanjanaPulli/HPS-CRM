import { Navigate } from 'react-router-dom'

export default function RequireAuth({ children, role }) {
  const admin = localStorage.getItem('adminAuth')
  const adminToken = localStorage.getItem('adminToken')
  const employee = localStorage.getItem('employeeAuth')
  const employeeToken = localStorage.getItem('employeeToken')

  if (role === 'admin' && (!admin || !adminToken)) {
    return <Navigate to="/" replace />
  }

  if (role === 'employee' && (!employee || !employeeToken)) {
    return <Navigate to="/employee/login" replace />
  }

  return children
}