import { Navigate } from 'react-router-dom'

export default function RequireAuth({ children, role }) {
  const admin = localStorage.getItem('adminAuth')
  const employee = localStorage.getItem('employeeAuth')

  if (role === 'admin' && !admin) {
    return <Navigate to="/login" replace />
  }

  if (role === 'employee' && !employee) {
    return <Navigate to="/employee/login" replace />
  }

  return children
}