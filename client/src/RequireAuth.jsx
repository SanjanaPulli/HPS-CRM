import { Navigate } from 'react-router-dom'

export default function RequireAuth({ children, role }) {
  const admin = localStorage.getItem('adminToken')
  const employee = localStorage.getItem('employeeToken')

  if (role === 'admin' && !admin) {
    return <Navigate to="/login" replace />
  }

  if (role === 'employee' && !employee) {
    return <Navigate to="/employee/login" replace />
  }

  return children
}